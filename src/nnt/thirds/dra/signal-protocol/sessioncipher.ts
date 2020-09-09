import {SessionStorage} from "./sessionstorage";
import {ChainType, SessionObject, SessionRecord} from "./sessionrecord";
import {SessionLock} from "./sessionlock";
import {Crypto} from "./crypto";
import {Util} from "./helpers";
import {IndexedObject} from "../../../core/kernel";
import {SessionBuilder} from "./sessionbuilder";

type SessionChain = IndexedObject;

export class SessionCipher {

    constructor(storage: SessionStorage, remoteAddress: string) {
        this._remoteAddress = remoteAddress;
        this._storage = storage;
    }

    private _remoteAddress: string;
    private _storage: SessionStorage;

    async getRecord(encodedNumber: string): Promise<SessionRecord> {
        return this._storage.loadSession(encodedNumber).then(serialized => {
            if (!serialized) {
                return null;
            }
            return SessionRecord.Deserialize(serialized);
        });
    }

    async encrypt(buffer: Uint8Array, encoding: string) {
        buffer = dcodeIO.ByteBuffer.wrap(buffer, encoding).toArrayBuffer();
        return Internal.SessionLock.queueJobForNumber(this.remoteAddress.toString(), function () {
            if (!(buffer instanceof ArrayBuffer)) {
                throw new Error("Expected buffer to be an ArrayBuffer");
            }

            var address = this.remoteAddress.toString();
            var ourIdentityKey, myRegistrationId, record, session, chain;

            var msg = new Internal.protobuf.WhisperMessage();

            return Promise.all([
                this.storage.getIdentityKeyPair(),
                this.storage.getLocalRegistrationId(),
                this.getRecord(address)
            ]).then(function (results) {
                ourIdentityKey = results[0];
                myRegistrationId = results[1];
                record = results[2];
                if (!record) {
                    throw new Error("No record for " + address);
                }
                session = record.getOpenSession();
                if (!session) {
                    throw new Error("No session to encrypt message for " + address);
                }

                msg.ephemeralKey = util.toArrayBuffer(
                    session.currentRatchet.ephemeralKeyPair.pubKey
                );
                chain = session[util.toString(msg.ephemeralKey)];
                if (chain.chainType === Internal.ChainType.RECEIVING) {
                    throw new Error("Tried to encrypt on a receiving chain");
                }

                return this.fillMessageKeys(chain, chain.chainKey.counter + 1);
            }.bind(this)).then(function () {
                return Internal.HKDF(
                    util.toArrayBuffer(chain.messageKeys[chain.chainKey.counter]),
                    new ArrayBuffer(32), "WhisperMessageKeys");
            }).then(function (keys) {
                delete chain.messageKeys[chain.chainKey.counter];
                msg.counter = chain.chainKey.counter;
                msg.previousCounter = session.currentRatchet.previousCounter;

                return Internal.crypto.encrypt(
                    keys[0], buffer, keys[2].slice(0, 16)
                ).then(function (ciphertext) {
                    msg.ciphertext = ciphertext;
                    var encodedMsg = msg.toArrayBuffer();

                    var macInput = new Uint8Array(encodedMsg.byteLength + 33 * 2 + 1);
                    macInput.set(new Uint8Array(util.toArrayBuffer(ourIdentityKey.pubKey)));
                    macInput.set(new Uint8Array(util.toArrayBuffer(session.indexInfo.remoteIdentityKey)), 33);
                    macInput[33 * 2] = (3 << 4) | 3;
                    macInput.set(new Uint8Array(encodedMsg), 33 * 2 + 1);

                    return Internal.crypto.sign(keys[1], macInput.buffer).then(function (mac) {
                        var result = new Uint8Array(encodedMsg.byteLength + 9);
                        result[0] = (3 << 4) | 3;
                        result.set(new Uint8Array(encodedMsg), 1);
                        result.set(new Uint8Array(mac, 0, 8), encodedMsg.byteLength + 1);

                        return this.storage.isTrustedIdentity(
                            this.remoteAddress.getName(), util.toArrayBuffer(session.indexInfo.remoteIdentityKey), this.storage.Direction.SENDING
                        ).then(function (trusted) {
                            if (!trusted) {
                                throw new Error('Identity key changed');
                            }
                        }).then(function () {
                            return this.storage.saveIdentity(this.remoteAddress.toString(), session.indexInfo.remoteIdentityKey);
                        }.bind(this)).then(function () {
                            record.updateSessionState(session);
                            return this.storage.storeSession(address, record.serialize()).then(function () {
                                return result;
                            });
                        }.bind(this));
                    }.bind(this));
                }.bind(this));
            }.bind(this)).then(function (message) {
                if (session.pendingPreKey !== undefined) {
                    var preKeyMsg = new Internal.protobuf.PreKeyWhisperMessage();
                    preKeyMsg.identityKey = util.toArrayBuffer(ourIdentityKey.pubKey);
                    preKeyMsg.registrationId = myRegistrationId;

                    preKeyMsg.baseKey = util.toArrayBuffer(session.pendingPreKey.baseKey);
                    if (session.pendingPreKey.preKeyId) {
                        preKeyMsg.preKeyId = session.pendingPreKey.preKeyId;
                    }
                    preKeyMsg.signedPreKeyId = session.pendingPreKey.signedKeyId;

                    preKeyMsg.message = message;
                    var result = String.fromCharCode((3 << 4) | 3) + util.toString(preKeyMsg.encode());
                    return {
                        type: 3,
                        body: result,
                        registrationId: session.registrationId
                    };

                } else {
                    return {
                        type: 1,
                        body: util.toString(message),
                        registrationId: session.registrationId
                    };
                }
            });
        }.bind(this));
    }

    async decryptWithSessionList(buffer: Uint8Array, sessionList: SessionObject[], errors: Error[]) {
        // Iterate recursively through the list, attempting to decrypt
        // using each one at a time. Stop and return the result if we get
        // a valid result
        if (sessionList.length === 0) {
            return Promise.reject(errors[0]);
        }

        let session = sessionList.pop();
        return this.doDecryptWhisperMessage(buffer, session)
            .then(plaintext => {
                return {plaintext: plaintext, session: session};
            }).catch(e => {
                if (e.name === 'MessageCounterError') {
                    return Promise.reject(e);
                }

                errors.push(e);
                return this.decryptWithSessionList(buffer, sessionList, errors);
            });
    }

    async decryptWhisperMessage() {
        buffer = dcodeIO.ByteBuffer.wrap(buffer, encoding).toArrayBuffer();
        return SessionLock.QueueJobForNumber(this._remoteAddress.toString(), () => {
            var address = this._remoteAddress.toString();
            return this.getRecord(address)
                .then(record => {
                    if (!record) {
                        throw new Error("No record for device " + address);
                    }
                    var errors = [];
                    return this.decryptWithSessionList(buffer, record.getSessions(), errors)
                        .then(result => {
                            return this.getRecord(address)
                                .then(record => {
                                    if (result.session.indexInfo.baseKey !== record.getOpenSession().indexInfo.baseKey) {
                                        record.archiveCurrentState();
                                        record.promoteState(result.session);
                                    }

                                    return this._storage.isTrustedIdentity(
                                        this.remoteAddress.getName(), util.toArrayBuffer(result.session.indexInfo.remoteIdentityKey), this.storage.Direction.RECEIVING
                                    ).then(trusted => {
                                        if (!trusted) {
                                            throw new Error('Identity key changed');
                                        }
                                    }).then(() => {
                                        return this._storage.saveIdentity(this.remoteAddress.toString(), result.session.indexInfo.remoteIdentityKey);
                                    }).then(() => {
                                        record.updateSessionState(result.session);
                                        return this._storage.storeSession(address, record.serialize()).then(function () {
                                            return result.plaintext;
                                        });
                                    });
                                });
                        });
                });
        });
    }

    async decryptPreKeyWhisperMessage(buffer: Uint8Array, encoding: string) {
        buffer = dcodeIO.ByteBuffer.wrap(buffer, encoding);
        var version = buffer.readUint8();
        if ((version & 0xF) > 3 || (version >> 4) < 3) {  // min version > 3 or max version < 3
            throw new Error("Incompatible version number on PreKeyWhisperMessage");
        }
        return SessionLock.QueueJobForNumber(this._remoteAddress.toString(), () => {
            var address = this._remoteAddress.toString();
            return this.getRecord(address).then(record => {
                var preKeyProto = PreKeyWhisperMessage.decode(buffer);
                if (!record) {
                    if (preKeyProto.registrationId === undefined) {
                        throw new Error("No registrationId");
                    }
                    record = new SessionRecord(
                        preKeyProto.registrationId
                    );
                }
                var builder = new SessionBuilder(this._storage, this._remoteAddress);
                // isTrustedIdentity is called within processV3, no need to call it here
                return builder.processV3(record, preKeyProto)
                    .then(preKeyId => {
                        let session = record.getSessionByBaseKey(preKeyProto.baseKey);
                        return this.doDecryptWhisperMessage(
                            preKeyProto.message.toArrayBuffer(), session
                        ).then(plaintext => {
                            record.updateSessionState(session);
                            return this._storage.storeSession(address, record.serialize())
                                .then(() => {
                                    if (preKeyId !== undefined && preKeyId !== null) {
                                        return this._storage.removePreKey(preKeyId);
                                    }
                                })
                                .then(() => {
                                    return plaintext;
                                });
                        });
                    });
            });
        });
    }

    private doDecryptWhisperMessage(messageBytes: Uint8Array, session: SessionObject) {
        if (!(messageBytes instanceof ArrayBuffer)) {
            throw new Error("Expected messageBytes to be an ArrayBuffer");
        }
        let version = (new Uint8Array(messageBytes))[0];
        if ((version & 0xF) > 3 || (version >> 4) < 3) {  // min version > 3 or max version < 3
            throw new Error("Incompatible version number on WhisperMessage");
        }
        let messageProto = messageBytes.slice(1, messageBytes.byteLength - 8);
        let mac = messageBytes.slice(messageBytes.byteLength - 8, messageBytes.byteLength);

        // var message = Internal.protobuf.WhisperMessage.decode(messageProto);
        let message: any = null;
        let remoteEphemeralKey = message.ephemeralKey.toArrayBuffer();

        if (session === undefined) {
            return Promise.reject(new Error("No session found to decrypt message from " + this._remoteAddress.toString()));
        }
        if (session.indexInfo.closed != -1) {
            console.log('decrypting message for closed session');
        }

        return this.maybeStepRatchet(session, remoteEphemeralKey, message.previousCounter)
            .then(() => {
                let chain = session[Util.ToString(message.ephemeralKey)];
                if (chain.chainType === ChainType.SENDING) {
                    throw new Error("Tried to decrypt on a sending chain");
                }

                return this.fillMessageKeys(chain, message.counter)
                    .then(() => {
                        let messageKey = chain.messageKeys[message.counter];
                        if (messageKey === undefined) {
                            var e = new Error("Message key not found. The counter was repeated or the key was not filled.");
                            e.name = 'MessageCounterError';
                            throw e;
                        }
                        delete chain.messageKeys[message.counter];
                        return Crypto.HKDF(messageKey, new Uint8Array(32), "WhisperMessageKeys");
                    });
            }).then(keys => {
                return this._storage.getIdentityKeyPair()
                    .then(ourIdentityKey => {

                        var macInput = new Uint8Array(messageProto.byteLength + 33 * 2 + 1);
                        macInput.set(session.indexInfo.remoteIdentityKey);
                        macInput.set(ourIdentityKey.pubKey, 33);
                        macInput[33 * 2] = (3 << 4) | 3;
                        macInput.set(new Uint8Array(messageProto), 33 * 2 + 1);

                        return Crypto.VerifyMAC(macInput, keys[1], mac, 8);
                    }).then(() => {
                        return Crypto.Decrypt(keys[0], message.ciphertext.toArrayBuffer(), keys[2].slice(0, 16));
                    });
            }).then(plaintext => {
                delete session.pendingPreKey;
                return plaintext;
            });
    }

    async fillMessageKeys(chain: SessionChain, counter: number): Promise<void> {
        if (chain.chainKey.counter >= counter) {
            return Promise.resolve(); // Already calculated
        }

        if (counter - chain.chainKey.counter > 2000) {
            throw new Error('Over 2000 messages into the future!');
        }

        if (chain.chainKey.key === undefined) {
            throw new Error("Got invalid request to extend chain after it was already closed");
        }

        let key = chain.chainKey.key;
        let byteArray = new Uint8Array(1);
        byteArray[0] = 1;
        return Crypto.Sign(key, byteArray)
            .then(mac => {
                byteArray[0] = 2;
                return Crypto.Sign(key, byteArray)
                    .then(key => {
                        chain.messageKeys[chain.chainKey.counter + 1] = mac;
                        chain.chainKey.key = key;
                        chain.chainKey.counter += 1;
                        return this.fillMessageKeys(chain, counter);
                    });
            });
    }

    async maybeStepRatchet(session: SessionObject, remoteKey: Uint8Array, previousCounter: number) {
        if (session[Util.ToString(remoteKey)] !== undefined) {
            return Promise.resolve();
        }

        console.log('New remote ephemeral key');
        var ratchet = session.currentRatchet;

        return Promise.resolve()
            .then(() => {
                var previousRatchet = session[Util.ToString(ratchet.lastRemoteEphemeralKey)];
                if (previousRatchet !== undefined) {
                    return this.fillMessageKeys(previousRatchet, previousCounter)
                        .then(() => {
                            delete previousRatchet.chainKey.key;
                            session.oldRatchetList[session.oldRatchetList.length] = {
                                added: Date.now(),
                                ephemeralKey: ratchet.lastRemoteEphemeralKey
                            };
                        });
                }
                return null;
            }).then(() => {
                return this.calculateRatchet(session, remoteKey, false).then(() => {
                    // Now swap the ephemeral key and calculate the new sending chain
                    var previousRatchet = Util.ToString(ratchet.ephemeralKeyPair.pubKey);
                    if (session[previousRatchet] !== undefined) {
                        ratchet.previousCounter = session[previousRatchet].chainKey.counter;
                        delete session[previousRatchet];
                    }

                    return Crypto.CreateKeyPair().then(keyPair => {
                        ratchet.ephemeralKeyPair = keyPair;
                        return this.calculateRatchet(session, remoteKey, true)
                            .then(() => {
                                ratchet.lastRemoteEphemeralKey = remoteKey;
                            });
                    });
                });
            });
    }

    async calculateRatchet(session: SessionObject, remoteKey: Uint8Array, sending: boolean) {
        let ratchet = session.currentRatchet;

        return Crypto.ECDHE(remoteKey, ratchet.ephemeralKeyPair.privKey).then(sharedSecret => {
            return Crypto.HKDF(sharedSecret, ratchet.rootKey, "WhisperRatchet")
                .then(function (masterKey) {
                    let ephemeralPublicKey;
                    if (sending) {
                        ephemeralPublicKey = ratchet.ephemeralKeyPair.pubKey;
                    } else {
                        ephemeralPublicKey = remoteKey;
                    }
                    session[Util.ToString(ephemeralPublicKey)] = {
                        messageKeys: {},
                        chainKey: {counter: -1, key: masterKey[1]},
                        chainType: sending ? ChainType.SENDING : ChainType.RECEIVING
                    };
                    ratchet.rootKey = masterKey[0];
                });
        });
    }

    async getRemoteRegistrationId() {
        return SessionLock.QueueJobForNumber(this._remoteAddress.toString(), () => {
            return this.getRecord(this._remoteAddress.toString())
                .then(record => {
                    if (!record) {
                        return null;
                    }
                    let openSession = record.getOpenSession();
                    if (!openSession) {
                        return null;
                    }
                    return openSession.registrationId;
                });
        });
    }

    async hasOpenSession() {
        return SessionLock.QueueJobForNumber(this._remoteAddress.toString(), () => {
            return this.getRecord(this._remoteAddress.toString())
                .then(record => {
                    if (record === undefined) {
                        return false;
                    }
                    return record.haveOpenSession();
                });
        });
    }

    async closeOpenSessionForDevice() {
        let address = this._remoteAddress.toString();
        return SessionLock.QueueJobForNumber(address, () => {
            return this.getRecord(address)
                .then(record => {
                    if (record === undefined || record.getOpenSession() === undefined) {
                        return null;
                    }

                    record.archiveCurrentState();
                    return this._storage.storeSession(address, record.serialize());
                });
        });
    }

    async deleteAllSessionsForDevice() {
        // Used in session reset scenarios, where we really need to delete
        let address = this._remoteAddress.toString();
        return SessionLock.QueueJobForNumber(address, () => {
            return this.getRecord(address)
                .then(record => {
                    if (!record) {
                        return null;
                    }

                    record.deleteAllSessions();
                    return this._storage.storeSession(address, record.serialize());
                });
        });
    }
}