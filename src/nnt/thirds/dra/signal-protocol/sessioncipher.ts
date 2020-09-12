import {SessionStorage} from "./sessionstorage";
import {SessionRecord} from "./sessionrecord";
import {PreKeyWhisperMessage, WhisperMessage} from "./protocol";
import {Crypto} from "./crypto";
import {Address} from "./address";
import {ChainType, DecryptedMessage, EncryptedMessage, KeyPair, OldRatchet, RatchetChain, Session} from "./model";
import {SessionBuilder} from "./sessionbuilder";

export class SessionCipher {

    constructor(storage: SessionStorage, remoteAddress: Address) {
        this._remoteAddress = remoteAddress;
        this._storage = storage;
    }

    private _remoteAddress: Address;
    private _storage: SessionStorage;

    async getRecord(encodedNumber: string): Promise<SessionRecord> {
        let serialized = await this._storage.loadSession(encodedNumber);
        if (!serialized) {
            return null;
        }
        return SessionRecord.Deserialize(serialized);
    }

    async encrypt(buffer: Buffer): Promise<EncryptedMessage> {
        let address = this._remoteAddress.toString();
        let msg = new WhisperMessage();

        let ourIdentityKey = await this._storage.getIdentityKeyPair();
        let myRegistrationId = await this._storage.getLocalRegistrationId();

        let record = await this.getRecord(address);
        if (!record) {
            throw new Error("dra: No record for " + address);
        }

        let session = record.getOpenSession();
        if (!session) {
            throw new Error("dra: No session to encrypt message for " + address);
        }

        msg.ephemeralKey = session.currentRatchet.ephemeralKeyPair;

        let chain = session.chains.get(msg.ephemeralKey.hash);
        if (chain.chainType === ChainType.RECEIVING) {
            throw new Error("Tried to encrypt on a receiving chain");
        }

        await this.fillMessageKeys(chain, chain.chainCounter + 1);

        let keys = await Crypto.HKDF(
            chain.messageKeys.get(chain.chainCounter).buffer,
            Buffer.alloc(32),
            Buffer.from("WhisperMessageKeys"));

        chain.messageKeys.delete(chain.chainCounter);
        msg.counter = chain.chainCounter;
        msg.previousCounter = session.currentRatchet.previousCounter;
        msg.ciphertext = Crypto.Encrypt(keys[0].buffer, buffer, keys[2].slice(0, 16));

        let encodedMsg = msg.serialout();

        let macInput = new Buffer(encodedMsg.byteLength + 33 * 2 + 1);
        macInput.set(ourIdentityKey.publicBuffer);
        macInput.set(session.indexInfo.remoteIdentityKey.publicBuffer, 33);
        macInput[33 * 2] = (3 << 4) | 3;
        macInput.set(encodedMsg, 33 * 2 + 1);

        let mac = Crypto.Sign(keys[1].buffer, macInput);
        let result = new Buffer(encodedMsg.byteLength + 9);
        result[0] = (3 << 4) | 3;
        result.set(encodedMsg, 1);
        result.set(mac.slice(0, 8), encodedMsg.byteLength + 1);

        let trusted = await this._storage.isTrustedIdentity(this._remoteAddress.name, session.indexInfo.remoteIdentityKey, ChainType.SENDING);
        if (!trusted) {
            throw new Error('dra: Identity key changed');
        }

        await this._storage.saveIdentity(this._remoteAddress.toString(), session.indexInfo.remoteIdentityKey);

        record.updateSessionState(session);
        await this._storage.storeSession(address, record.serialize());

        let message = result;
        if (session.pendingPreKey !== undefined) {
            let preKeyMsg = new PreKeyWhisperMessage();
            preKeyMsg.identityKey = ourIdentityKey;
            preKeyMsg.registrationId = myRegistrationId;
            preKeyMsg.baseKey = session.pendingPreKey.baseKey;
            if (session.pendingPreKey.preKeyId) {
                preKeyMsg.preKeyId = session.pendingPreKey.preKeyId;
            }
            preKeyMsg.signedPreKeyId = session.pendingPreKey.signedKeyId;
            preKeyMsg.message = message;

            let body = Buffer.concat([
                Buffer.alloc(1, (3 << 4) | 3),
                preKeyMsg.serialout()
            ]);
            return {
                type: 3,
                body: body,
                registrationId: session.registrationId
            };

        } else {
            return {
                type: 1,
                body: message,
                registrationId: session.registrationId
            };
        }
    }

    async decryptWithSessionList(buffer: Buffer, sessionList: Session[], errors: Error[]): Promise<DecryptedMessage> {
        // Iterate recursively through the list, attempting to decrypt
        // using each one at a time. Stop and return the result if we get
        // a valid result
        if (sessionList.length === 0) {
            throw errors[0];
        }

        let session = sessionList.pop();

        try {
            return await this.doDecryptWhisperMessage(buffer, session);
        } catch (e) {
            if (e.name === 'MessageCounterError') {
                throw e;
            }

            errors.push(e);
            return this.decryptWithSessionList(buffer, sessionList, errors);
        }
    }

    async decryptWhisperMessage(buffer: Buffer): Promise<DecryptedMessage> {
        let address = this._remoteAddress.toString();
        let record = await this.getRecord(address);
        if (!record) {
            throw new Error("dra: No record for device " + address);
        }

        let errors: Error[] = [];
        let result = await this.decryptWithSessionList(buffer, record.getSessions(), errors);
        record = await this.getRecord(address);
        if (result.session.indexInfo.baseKey !== record.getOpenSession().indexInfo.baseKey) {
            record.archiveCurrentState();
            record.promoteState(result.session);
        }

        let trusted = await this._storage.isTrustedIdentity(this._remoteAddress.name, result.session.indexInfo.remoteIdentityKey, ChainType.RECEIVING);
        if (!trusted) {
            throw new Error('dra: Identity key changed');
        }

        await this._storage.saveIdentity(address, result.session.indexInfo.remoteIdentityKey);
        record.updateSessionState(result.session);

        await this._storage.storeSession(address, record.serialize());

        return result;
    }

    async decryptPreKeyWhisperMessage(buffer: Buffer): Promise<DecryptedMessage> {
        let version = buffer.readUInt8();
        if ((version & 0xF) > 3 || (version >> 4) < 3) {  // min version > 3 or max version < 3
            throw new Error("Incompatible version number on PreKeyWhisperMessage");
        }

        let address = this._remoteAddress.toString();
        let record = await this.getRecord(address);

        let preKeyProto = new PreKeyWhisperMessage();
        preKeyProto.serialin(buffer);
        if (!record) {
            if (preKeyProto.registrationId == null) {
                throw new Error("dra: No registrationId");
            }
            record = new SessionRecord();
        }

        let builder = new SessionBuilder(this._storage, this._remoteAddress);
        let preKeyId = await builder.processV3(record, preKeyProto);
        let session = record.getSessionByBaseKey(preKeyProto.baseKey);
        let plaintext = await this.doDecryptWhisperMessage(preKeyProto.message, session);
        record.updateSessionState(session);
        await this._storage.storeSession(address, record.serialize());

        if (preKeyId && preKeyId) {
            await this._storage.removePreKey(preKeyId);
        }

        return plaintext;
    }

    private async doDecryptWhisperMessage(messageBytes: Buffer, session: Session): Promise<DecryptedMessage> {
        let version = messageBytes.readUInt8();
        if ((version & 0xF) > 3 || (version >> 4) < 3) {  // min version > 3 or max version < 3
            throw new Error("dra: Incompatible version number on WhisperMessage");
        }

        let messageProto = messageBytes.slice(1, messageBytes.byteLength - 8);
        let mac = messageBytes.slice(messageBytes.byteLength - 8, messageBytes.byteLength);

        let message = new WhisperMessage();
        message.serialin(messageProto);
        let remoteEphemeralKey = message.ephemeralKey;

        let address = this._remoteAddress.toString();
        if (!session) {
            throw new Error("dra: No session found to decrypt message from " + address);
        }

        if (session.indexInfo.timeClosed != -1) {
            console.log('dra: decrypting message for closed session');
        }

        await this.maybeStepRatchet(session, remoteEphemeralKey, message.previousCounter);

        let chain = session.chains.get(message.ephemeralKey.hash);
        if (chain.chainType == ChainType.SENDING) {
            throw new Error("dra: Tried to decrypt on a sending chain");
        }

        await this.fillMessageKeys(chain, message.counter);

        let messageKey = chain.messageKeys.get(message.counter);
        if (!messageKey) {
            let e = new Error("dra: Message key not found. The counter was repeated or the key was not filled.");
            e.name = 'MessageCounterError';
            throw e;
        }
        chain.messageKeys.delete(message.counter);

        let keys = await Crypto.HKDF(messageKey.buffer, Buffer.alloc(32), Buffer.from("WhisperMessageKeys"));
        let ourIdentityKey = await this._storage.getIdentityKeyPair();

        let macInput = new Buffer(messageProto.byteLength + 33 * 2 + 1);
        macInput.set(session.indexInfo.remoteIdentityKey.publicBuffer);
        macInput.set(ourIdentityKey.publicBuffer, 33);
        macInput[33 * 2] = (3 << 4) | 3;
        macInput.set(messageProto, 33 * 2 + 1);

        if (!Crypto.VerifyMAC(macInput, keys[1].buffer, mac, 8)) {
            throw new Error("dra: Bad Mac");
        }

        let r = new DecryptedMessage();
        r.session = session;
        r.plaintext = Crypto.Decrypt(keys[0].buffer, message.ciphertext, keys[2].slice(0, 16));
        session.pendingPreKey = null;
        return r;
    }

    async fillMessageKeys(chain: RatchetChain, counter: number): Promise<void> {
        if (chain.chainCounter >= counter) {
            return;
        }
        if (counter - chain.chainCounter > 2000) {
            throw new Error('dra: Over 2000 messages into the future!');
        }
        if (!chain.chainKey) {
            throw new Error("dra: Got invalid request to extend chain after it was already closed");
        }

        let key = chain.chainKey;
        let byteArray = Buffer.alloc(1);

        byteArray[0] = 1;
        let mac1 = Crypto.Sign(key.buffer, byteArray);

        byteArray[0] = 2;
        let mac2 = Crypto.Sign(key.buffer, byteArray);

        chain.messageKeys.set(chain.chainCounter + 1, mac1);
        chain.chainKey = mac2;
        chain.chainCounter += 1;

        await this.fillMessageKeys(chain, counter);
    }

    async maybeStepRatchet(session: Session, remoteKey: KeyPair, previousCounter: number) {
        if (session.chains.has(remoteKey.hash))
            return;

        console.log('dra: New remote ephemeral key');
        let ratchet = session.currentRatchet;

        let previousRatchet = session.chains.get(ratchet.lastRemoteEphemeralKey.hash);
        if (previousRatchet) {
            await this.fillMessageKeys(previousRatchet, previousCounter);
            previousRatchet.chainKey = null;

            let r = new OldRatchet();
            r.timeAdded = Date.now();
            r.ephemeralKey = ratchet.lastRemoteEphemeralKey;
            session.oldRatchetList.push(r);
        }

        await this.calculateRatchet(session, remoteKey, false);

        // Now swap the ephemeral key and calculate the new sending chain
        let previousRatchetChain = session.chains.get(ratchet.ephemeralKeyPair.hash);
        if (previousRatchetChain) {
            ratchet.previousCounter = previousRatchetChain.chainCounter;
            session.chains.delete(ratchet.ephemeralKeyPair.hash);
        }

        ratchet.ephemeralKeyPair = Crypto.CreateKeyPair();
        await this.calculateRatchet(session, remoteKey, true);
        ratchet.lastRemoteEphemeralKey = remoteKey;
    }

    async calculateRatchet(session: Session, remoteKey: KeyPair, sending: boolean) {
        let ratchet = session.currentRatchet;
        let sharedSecret = Crypto.ECDHE(remoteKey, ratchet.ephemeralKeyPair);
        let masterKey = Crypto.HKDF(sharedSecret.buffer, ratchet.rootKey.buffer, Buffer.from("WhisperRatchet"));

        let ephemeralPublicKey: KeyPair;
        if (sending) {
            ephemeralPublicKey = ratchet.ephemeralKeyPair;
        } else {
            ephemeralPublicKey = remoteKey;
        }

        let r = new RatchetChain();
        r.chainKey = masterKey[1];
        r.chainType = sending ? ChainType.SENDING : ChainType.RECEIVING;
        session.chains.set(ephemeralPublicKey.hash, r);

        ratchet.rootKey = masterKey[0];
    }

    async getRemoteRegistrationId(): Promise<number> {
        let record = await this.getRecord(this._remoteAddress.toString());
        if (!record) {
            return null;
        }
        let openSession = record.getOpenSession();
        if (!openSession) {
            return null;
        }
        return openSession.registrationId;
    }

    async hasOpenSession(identifier?: string): Promise<boolean> {
        let record = await this.getRecord(identifier ? identifier : this._remoteAddress.toString());
        if (!record) {
            return false;
        }
        return record.haveOpenSession();
    }

    async closeOpenSessionForDevice() {
        let address = this._remoteAddress.toString();
        let record = await this.getRecord(address);
        if (!record && !record.getOpenSession()) {
            return;
        }

        record.archiveCurrentState();
        await this._storage.storeSession(address, record.serialize());
    }

    async deleteAllSessionsForDevice() {
        // Used in session reset scenarios, where we really need to delete
        let address = this._remoteAddress.toString();
        let record = await this.getRecord(address);
        if (!record && !record.getOpenSession()) {
            return;
        }
        record.deleteAllSessions();
        await this._storage.storeSession(address, record.serialize());
    }
}