import {SessionStorage} from "./sessionstorage";
import {BaseKeyType, ChainType} from "./sessionrecord";
import {SessionLock} from "./sessionlock";
import {Address} from "./address";
import {DeviceKey, ErrorExt, KeyPair, PreKey, Ratchet, RatchetChain, Session, SessionIndexInfo} from "./model";
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

    async processV3(record, message: PreKeyWhisperMessage) {
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

        let session = record.getSessionByBaseKey(message.baseKey);
    }

    async initSession(isInitiator: boolean,
                      ourEphemeralKey: KeyPair, ourSignedKey: KeyPair,
                      theirIdentityPubKey: FixedBuffer32, theirEphemeralPubKey: FixedBuffer32, theirSignedPubKey: FixedBuffer32,
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
            info.closed = -1;
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


    calculateSendingRatchet(session: Session, remoteKey: FixedBuffer32) {
        let ratchet = session.currentRatchet;

        let sharedSecret = Crypto.ECDHE(
            remoteKey, ratchet.ephemeralKeyPair.privKeyX);

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
