import {SessionStorage} from "./sessionstorage";
import {BaseKeyType, ChainType, SessionRecord} from "./sessionrecord";
import {SessionLock} from "./sessionlock";
import {Address} from "./address";
import {
    DeviceKey,
    ErrorExt,
    KeyPair,
    PendingPreKey,
    PreKey,
    Ratchet,
    RatchetChain,
    Session,
    SessionIndexInfo,
    X25519Key
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

    async processPreKey(device: DeviceKey) {
        return SessionLock.QueueJobForNumber(this._remoteAddress.toString(), async () => {
            let trusted = await this._storage.isTrustedIdentity(this._remoteAddress.name, device.identityKey, ChainType.SENDING);
            if (!trusted) {
                throw new Error('dra: Identity key changed');
            }

            let verified = Crypto.Ed25519Verify(device.identityKey, device.signedPreKey.pubKeyX.buffer, device.signedPreKey.signature);
            if (!verified) {
                throw new Error('dra: Signature error');
            }

            let baseKey = Crypto.CreateKeyPair();

            let devicePreKey: X25519Key;
            if (device.preKey) {
                devicePreKey = device.preKey.pubKeyX;
            }

            let session = await this.initSession(
                true,
                baseKey,
                null,
                device.identityKey,
                devicePreKey,
                device.signedPreKey.pubKeyX,
                device.registrationId
            );

            session.pendingPreKey = use(new PendingPreKey(), prk => {
                prk.signedKeyId = device.signedPreKey.keyId;
                prk.baseKey = baseKey.pubKeyX;
            });

            if (device.preKey) {
                session.pendingPreKey.preKeyId = device.preKey.keyId;
            }

            let address = this._remoteAddress.toString();
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
        });
    }

    async processV3(record: SessionRecord, message: PreKeyWhisperMessage): Promise<number> {
        let preKeyPair: PreKey;
        let signedPreKeyPair: PreKey;
        let session: Session;

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

        preKeyPair = results[0];
        signedPreKeyPair = results[1];

        session = record.getSessionByBaseKey(message.baseKey);
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
                      theirIdentityPubKey: X25519Key, theirEphemeralPubKey: X25519Key, theirSignedPubKey: X25519Key,
                      registrationId: number): Promise<Session> {
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

        let session = new Session();
        session.registrationId = registrationId;

        session.currentRatchet = use(new Ratchet(), r => {
            r.rootKey = masterKey[0];
            r.lastRemoteEphemeralKey = theirSignedPubKey;
            r.previousCounter = 0;
        });

        session.indexInfo = use(new SessionIndexInfo(), info => {
            info.remoteIdentityKey = theirIdentityPubKey;
        });

        if (isInitiator) {
            session.indexInfo.baseKey = ourEphemeralKey.pubKeyX;
            session.indexInfo.baseKeyType = BaseKeyType.OURS;

            let ourSendingEphemeralKey = Crypto.CreateKeyPair();
            session.currentRatchet.ephemeralKeyPair = ourSendingEphemeralKey;
            this.calculateSendingRatchet(session, theirSignedPubKey);
        } else {
            session.indexInfo.baseKey = theirEphemeralPubKey;
            session.indexInfo.baseKeyType = BaseKeyType.THEIRS;
            session.currentRatchet.ephemeralKeyPair = ourSignedKey;
        }

        return session;
    }


    calculateSendingRatchet(session: Session, remoteKey: X25519Key) {
        let ratchet = session.currentRatchet;

        let sharedSecret = Crypto.ECDHE(remoteKey, ratchet.ephemeralKeyPair.privKeyX);

        let masterKey = Crypto.HKDF(sharedSecret.buffer, ratchet.rootKey, Buffer.from("WhisperRatchet"));

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
