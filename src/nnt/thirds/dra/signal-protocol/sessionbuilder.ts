import {SessionStorage} from "./sessionstorage";
import {ChainType} from "./sessionrecord";
import {SessionLock} from "./sessionlock";
import {Address} from "./address";
import {DeviceKey, KeyPair, RatchetChain, Session} from "./model";
import {Crypto} from "./crypto";
import {FixedBuffer32} from "../../../core/buffer";

export class SessionBuilder {

    constructor(storage: SessionStorage, remoteAddress: Address) {
        this._remoteAddress = remoteAddress;
        this._storage = storage;
    }

    private _remoteAddress: Address;
    private _storage: SessionStorage;

    async processPreKey(device: DeviceKey) {
        return SessionLock.QueueJobForNumber(this._remoteAddress.toString(), async () => {
            let trusted = await this._storage.isTrustedIdentity(this._remoteAddress.name, device.identityKey, ChainType.SENDING);
            if (!trusted) {
                throw new Error('dra: Identity key changed');
            }

            let verified = Crypto.Ed25519Verify(device.identityKey, device.signedPreKey.keyPair.pubKeyX.buffer, device.signedPreKey.signature);
            if (!verified) {
                throw new Error('dra: Signature error');
            }

            let baseKey = Crypto.CreateKeyPair();

            let devicePreKey: FixedBuffer32;
            if (device.preKey) {
                devicePreKey = device.preKey.keyPair.pubKeyX;
            }
        });
    }

    processV3(record, message) {
        var preKeyPair, signedPreKeyPair, session;
        return this.storage.isTrustedIdentity(
            this.remoteAddress.getName(), message.identityKey.toArrayBuffer(), this.storage.Direction.RECEIVING
        ).then(function (trusted) {
            if (!trusted) {
                var e = new Error('Unknown identity key');
                e.identityKey = message.identityKey.toArrayBuffer();
                throw e;
            }
            return Promise.all([
                this.storage.loadPreKey(message.preKeyId),
                this.storage.loadSignedPreKey(message.signedPreKeyId),
            ]).then(function (results) {
                preKeyPair = results[0];
                signedPreKeyPair = results[1];
            });
        }).then(function () {
            session = record.getSessionByBaseKey(message.baseKey);
            if (session) {
                console.log("Duplicate PreKeyMessage for session");
                return;
            }

            session = record.getOpenSession();

            if (signedPreKeyPair === undefined) {
                // Session may or may not be the right one, but if its not, we
                // can't do anything about it ...fall through and let
                // decryptWhisperMessage handle that case
                if (session !== undefined && session.currentRatchet !== undefined) {
                    return;
                } else {
                    throw new Error("Missing Signed PreKey for PreKeyWhisperMessage");
                }
            }

            if (session !== undefined) {
                record.archiveCurrentState();
            }
            if (message.preKeyId && !preKeyPair) {
                console.log('Invalid prekey id', message.preKeyId);
            }
            return this.initSession(false, preKeyPair, signedPreKeyPair,
                message.identityKey.toArrayBuffer(),
                message.baseKey.toArrayBuffer(), undefined, message.registrationId
            ).then(function (new_session) {
                // Note that the session is not actually saved until the very
                // end of decryptWhisperMessage ... to ensure that the sender
                // actually holds the private keys for all reported pubkeys
                record.updateSessionState(new_session);
                return this.storage.saveIdentity(this.remoteAddress.toString(), message.identityKey.toArrayBuffer()).then(function () {
                    return message.preKeyId;
                });
            });
        });
    }

    async initSession(isInitiator: boolean,
                      ourEphemeralKey: KeyPair, ourSignedKey: KeyPair,
                      theirIdentityPubKey: FixedBuffer32, theirEphemeralPubKey: FixedBuffer32, theirSignedPubKey: FixedBuffer32,
                      registrationId: number) {
        let ourIdentityKey = await this._storage.getIdentityKeyPair();

        if (isInitiator) {
            if (ourSignedKey) {
                throw new Error("dra: Invalid call to initSession");
            }
            ourSignedKey = ourEphemeralKey;
        } else {
            if (theirSignedPubKey) {
                throw new Error("dra: Invalid call to initSession");
            }
            theirSignedPubKey = theirEphemeralPubKey;
        }

        let sharedSecret: Buffer;
        if (!ourEphemeralKey || !theirEphemeralPubKey) {
            sharedSecret = Buffer.alloc(32 * 4, 0xff);
        } else {
            sharedSecret = Buffer.alloc(32 * 5, 0xff);
        }

        let ecRes = [
            Crypto.ECDHE(theirSignedPubKey, ourIdentityKey.privKeyX),
            Crypto.ECDHE(theirIdentityPubKey, ourSignedKey.privKeyX),
            Crypto.ECDHE(theirSignedPubKey, ourSignedKey.privKeyX)
        ];

        if (isInitiator) {
            sharedSecret.set(ecRes[0].buffer, 32);
            sharedSecret.set(ecRes[1].buffer, 32 * 2);
        } else {
            sharedSecret.set(ecRes[0].buffer, 32 * 2);
            sharedSecret.set(ecRes[1].buffer, 32);
        }
        sharedSecret.set(ecRes[2].buffer, 32 * 3);

        if (ourEphemeralKey && theirEphemeralPubKey) {
            let ecRes4 = Crypto.ECDHE(theirEphemeralPubKey, ourEphemeralKey.privKeyX);
            sharedSecret.set(ecRes4.buffer, 32 * 4);
        }

        let masterKey = Crypto.HKDF(sharedSecret, new FixedBuffer32(), Buffer.from("WhisperText"));

    }

    calculateSendingRatchet(session: Session, remoteKey: FixedBuffer32) {
        let ratchet = session.currentRatchet;

        let sharedSecret = Crypto.ECDHE(
            remoteKey, ratchet.ephemeralKeyPair.privKeyX);

        let masterKey = Crypto.HKDF(sharedSecret, ratchet.rootKey, Buffer.from("WhisperRatchet"));

        let rc = new RatchetChain();
        rc.chainType = ChainType.SENDING;
        rc.chainKey = {
            counter: -1,
            key: masterKey[1]
        };
        session.chains.set(ratchet.ephemeralKeyPair.pubKeyX.toString(), rc);
        ratchet.rootKey = masterKey[0];
    }
}
