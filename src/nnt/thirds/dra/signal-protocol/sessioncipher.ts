import {SessionStorage} from "./sessionstorage";
import {ChainType, SessionRecord} from "./sessionrecord";
import {IndexedObject} from "../../../core/kernel";
import {PreKeyWhisperMessage, WhisperMessage} from "./protocol";
import {Crypto} from "./crypto";
import {FixedBuffer32} from "../../../core/buffer";
import {Address} from "./address";
import {EncryptedMessage} from "./model";

type SessionChain = IndexedObject;

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

    async encrypt(buffer: Buffer, encoding: string): Promise<EncryptedMessage> {
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

        msg.ephemeralKey = session.currentRatchet.ephemeralKeyPair.pubKeyX;

        let chain = session.chains.get(msg.ephemeralKey.hash);
        if (chain.chainType === ChainType.RECEIVING) {
            throw new Error("Tried to encrypt on a receiving chain");
        }

        await this.fillMessageKeys(chain, chain.chainKey.counter + 1);

        let keys = await Crypto.HKDF(
            chain.messageKeys[chain.chainKey.counter],
            new FixedBuffer32(),
            Buffer.from("WhisperMessageKeys"));

        delete chain.messageKeys[chain.chainKey.counter];
        msg.counter = chain.chainKey.counter;
        msg.previousCounter = session.currentRatchet.previousCounter;

        let ciphertext = Crypto.Encrypt(
            keys[0].buffer, buffer, keys[2].slice(0, 16)
        );

        msg.ciphertext = ciphertext;
        let encodedMsg = msg.serialout();

        let macInput = new Uint8Array(encodedMsg.byteLength + 33 * 2 + 1);
        macInput.set(ourIdentityKey.pubKeyX.buffer);
        macInput.set(session.indexInfo.remoteIdentityKey.buffer, 33);
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
            preKeyMsg.identityKey = ourIdentityKey.pubKeyX;
            preKeyMsg.registrationId = myRegistrationId;
            preKeyMsg.baseKey = session.pendingPreKey.baseKey;
            if (session.pendingPreKey.preKeyId) {
                preKeyMsg.preKeyId = session.pendingPreKey.preKeyId;
            }
            preKeyMsg.signedPreKeyId = session.pendingPreKey.signedKeyId;
            preKeyMsg.message = message;
            let body = String.fromCharCode((3 << 4) | 3) + preKeyMsg.serialout().toString('utf8')
            return {
                type: 3,
                body: body,
                registrationId: session.registrationId
            };

        } else {
            return {
                type: 1,
                body: message.toString('utf8'),
                registrationId: session.registrationId
            };
        }
    }

    async decryptWithSessionList(buffer: Uint8Array, sessionList: SessionObject[], errors: Error[]) {

    }

    async decryptWhisperMessage() {

    }

    async decryptPreKeyWhisperMessage(buffer: Uint8Array, encoding: string) {

    }

    private doDecryptWhisperMessage(messageBytes: Uint8Array, session: SessionObject) {

    }

    async fillMessageKeys(chain: SessionChain, counter: number): Promise<void> {

    }

    async maybeStepRatchet(session: SessionObject, remoteKey: Uint8Array, previousCounter: number) {

    }

    async calculateRatchet(session: SessionObject, remoteKey: Uint8Array, sending: boolean) {

    }

    async getRemoteRegistrationId() {

    }

    async hasOpenSession() {

    }

    async closeOpenSessionForDevice() {

    }

    async deleteAllSessionsForDevice() {

    }
}