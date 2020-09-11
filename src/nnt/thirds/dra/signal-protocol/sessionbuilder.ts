import {SessionStorage} from "./sessionstorage";
import {SessionRecord} from "./sessionrecord";
import {Address} from "./address";
import {
    BaseKeyType,
    ChainType,
    Device,
    ErrorExt,
    KeyPair,
    PendingPreKey,
    PreKey,
    Ratchet,
    RatchetChain,
    Session,
    SessionIndexInfo
} from "./model";
import {Crypto} from "./crypto";
import {FixedBuffer32} from "../../../core/buffer";
import {use} from "../../../core/kernel";
import {PreKeyWhisperMessage} from "./protocol";

export class SessionBuilder {

    constructor(storage: SessionStorage, remoteAddress: Address) {
        this._remoteAddress = remoteAddress;
        this._storage = storage;
    }

    private _remoteAddress: Address;
    private _storage: SessionStorage;

    async processPreKey(device: Device) {
        let address = this._remoteAddress.toString();

        let trusted = await this._storage.isTrustedIdentity(address, device.identityKey, ChainType.SENDING);
        if (!trusted) {
            throw new Error('dra: Identity key changed');
        }

        let verified = Crypto.Ed25519Verify(device.identityKey, device.signedPreKey.pubKeyX.buffer, device.signedPreKey.signature);
        if (!verified) {
            throw new Error('dra: Signature error');
        }

        let baseKey = Crypto.CreateKeyPair();

        let devicePreKey: PreKey;
        if (device.preKey) {
            devicePreKey = device.preKey;
        }

        let session = await this.initSession(
            true,
            baseKey,
            null,
            device.identityKey,
            devicePreKey,
            device.signedPreKey,
            device.registrationId
        );

        session.pendingPreKey = use(new PendingPreKey(), prk => {
            prk.signedKeyId = device.signedPreKey.keyId;
            prk.baseKey = baseKey;
            if (devicePreKey)
                prk.preKeyId = devicePreKey.keyId;
        });

        let serialized = await this._storage.loadSession(address);

        let record: SessionRecord;
        if (serialized) {
            record = SessionRecord.Deserialize(serialized);
        } else {
            record = new SessionRecord();
        }

        record.archiveCurrentState();
        record.updateSessionState(session);

        await this._storage.storeSession(address, record.serialize());
        await this._storage.saveIdentity(address, session.indexInfo.remoteIdentityKey)
    }

    async processV3(record: SessionRecord, message: PreKeyWhisperMessage): Promise<number> {
        let trusted = await this._storage.isTrustedIdentity(this._remoteAddress.name, message.identityKey, ChainType.SENDING);

        if (!trusted) {
            let e = new ErrorExt('dra: Unknown identity key');
            e.identityKey = message.identityKey;
            throw e;
        }

        let results = [
            await this._storage.loadPreKey(message.preKeyId),
            await this._storage.loadSignedPreKey(message.signedPreKeyId)
        ];

        let preKeyPair = await this._storage.loadPreKey(message.preKeyId);
        let signedPreKeyPair = await this._storage.loadSignedPreKey(message.signedPreKeyId);

        let session = record.getSessionByBaseKey(message.baseKey);
        if (session) {
            console.log("Duplicate PreKeyMessage for session");
            return null;
        }

        session = record.getOpenSession();
        if (!signedPreKeyPair) {
            // Session may or may not be the right one, but if its not, we
            // can't do anything about it ...fall through and let
            // decryptWhisperMessage handle that case
            if (session && session.currentRatchet) {
                return null;
            } else {
                throw new Error("dra: Missing Signed PreKey for PreKeyWhisperMessage");
            }
        }

        if (session) {
            record.archiveCurrentState();
        }

        if (message.preKeyId && !preKeyPair) {
            console.log('dra: Invalid prekey id', message.preKeyId);
        }

        let new_session = await this.initSession(
            false,
            preKeyPair,
            signedPreKeyPair,
            message.identityKey,
            message.baseKey,
            null,
            message.registrationId
        );

        // Note that the session is not actually saved until the very
        // end of decryptWhisperMessage ... to ensure that the sender
        // actually holds the private keys for all reported pubkeys
        record.updateSessionState(new_session);

        await this._storage.saveIdentity(this._remoteAddress.toString(), message.identityKey);

        return message.preKeyId;
    }

    async initSession(isInitiator: boolean,
                      ourEphemeralKey: KeyPair, ourSignedKey: KeyPair,
                      theirIdentityKey: KeyPair, theirEphemeralKey: KeyPair, theirSignedKey: KeyPair,
                      registrationId: number): Promise<Session> {
        let ourIdentityKey = await this._storage.getIdentityKeyPair();

        if (isInitiator) {
            ourSignedKey = ourEphemeralKey;
        } else {
            theirSignedKey = theirEphemeralKey;
        }

        let sharedSecret: Buffer;
        if (!ourEphemeralKey || !theirEphemeralKey) {
            sharedSecret = Buffer.alloc(32 * 4, 0xff);
        } else {
            sharedSecret = Buffer.alloc(32 * 5, 0xff);
        }

        let ecRes = [
            Crypto.ECDHE(theirSignedKey, ourIdentityKey),
            Crypto.ECDHE(theirIdentityKey, ourSignedKey),
            Crypto.ECDHE(theirSignedKey, ourSignedKey)
        ];

        if (isInitiator) {
            sharedSecret.set(ecRes[0].buffer, 32);
            sharedSecret.set(ecRes[1].buffer, 32 * 2);
        } else {
            sharedSecret.set(ecRes[0].buffer, 32 * 2);
            sharedSecret.set(ecRes[1].buffer, 32);
        }
        sharedSecret.set(ecRes[2].buffer, 32 * 3);

        if (ourEphemeralKey && theirEphemeralKey) {
            let ecRes4 = Crypto.ECDHE(theirEphemeralKey, ourEphemeralKey);
            sharedSecret.set(ecRes4.buffer, 32 * 4);
        }

        let masterKey = Crypto.HKDF(sharedSecret, new FixedBuffer32(), Buffer.from("WhisperText"));

        let session = new Session();
        session.registrationId = registrationId;

        session.currentRatchet = use(new Ratchet(), r => {
            r.rootKey = masterKey[0];
            r.lastRemoteEphemeralKey = theirSignedKey;
            r.previousCounter = 0;
        });

        session.indexInfo = use(new SessionIndexInfo(), info => {
            info.remoteIdentityKey = theirIdentityKey;
        });

        if (isInitiator) {
            session.indexInfo.baseKey = ourEphemeralKey;
            session.indexInfo.baseKeyType = BaseKeyType.OURS;

            let ourSendingEphemeralKey = Crypto.CreateKeyPair();
            session.currentRatchet.ephemeralKeyPair = ourSendingEphemeralKey;
            this.calculateSendingRatchet(session, theirSignedKey);
        } else {
            session.indexInfo.baseKey = theirEphemeralKey;
            session.indexInfo.baseKeyType = BaseKeyType.THEIRS;
            session.currentRatchet.ephemeralKeyPair = ourSignedKey;
        }

        return session;
    }

    calculateSendingRatchet(session: Session, remoteKey: KeyPair) {
        let ratchet = session.currentRatchet;

        let sharedSecret = Crypto.ECDHE(remoteKey, ratchet.ephemeralKeyPair);

        let masterKey = Crypto.HKDF(sharedSecret.buffer, ratchet.rootKey, Buffer.from("WhisperRatchet"));

        let rc = new RatchetChain();
        rc.chainType = ChainType.SENDING;
        rc.chainKey = masterKey[1];

        session.chains.set(ratchet.ephemeralKeyPair.hash, rc);
        ratchet.rootKey = masterKey[0];
    }
}
