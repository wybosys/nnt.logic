import {FixedBuffer32, FixedBuffer64, FixedBufferType, UnserializeFixedBuffer} from "../../../core/buffer";
import {ArrayT, IndexedObject} from "../../../core/kernel";
import {IPodObject} from "../../../core/object";
import ed2curve = require("ed2curve");

export enum BaseKeyType {
    OURS = 1,
    THEIRS = 2
}

export enum ChainType {
    SENDING = 1,
    RECEIVING = 2
}

export class ErrorExt extends Error {

    constructor(e: any) {
        super(e);
    }

    identityKey: KeyPair;
}

export class Ed25519PublicKey extends FixedBuffer32 {

    constructor(buf?: FixedBufferType) {
        super(buf);
    }

    toX(): X25519Key {
        return new X25519Key(ed2curve.convertPublicKey(this.buffer));
    }

    _ed25519: any;
}

export class Ed25519PrivateKey extends FixedBuffer64 {

    constructor(buf?: FixedBufferType) {
        super(buf);
    }

    toX(): X25519Key {
        return new X25519Key(ed2curve.convertSecretKey(this.buffer));
    }

    _ed25519: any;
}

export class X25519Key extends FixedBuffer32 {

    constructor(buf?: FixedBufferType) {
        super(buf);
    }

    _x25519: any;
}

export type KeyHashType = number;

export class KeyPair implements IPodObject {

    // ed25519用于签名
    pubKeyEd: Ed25519PublicKey;
    privKeyEd: Ed25519PrivateKey;

    // x25519用于加密和dh
    pubKeyX: X25519Key;
    privKeyX: X25519Key;

    get hash(): number {
        return this.pubKeyX.hash;
    }

    // 用于输出的keybuffer
    get publicBuffer(): Uint8Array {
        return this.pubKeyEd.buffer;
    }

    reset(r: KeyPair) {
        this.pubKeyEd = r.pubKeyEd;
        this.privKeyEd = r.privKeyEd;
        this.pubKeyX = r.pubKeyX;
        this.privKeyX = r.privKeyX;
    }

    toPod(): IndexedObject {
        return {
            pubKeyEd: this.pubKeyEd.serialize()
        };
    }

    fromPod(obj: IndexedObject): boolean {
        this.pubKeyEd = UnserializeFixedBuffer(new Ed25519PublicKey(), obj.pubKeyEd);
        this.pubKeyX = this.pubKeyEd.toX();
        return true;
    }
}

export class PreKey extends KeyPair {

    keyId: number;

    toPod(): IndexedObject {
        return {};
    }

    fromPod(obj: IndexedObject): boolean {
        return false;
    }
}

export class SignedPreKey extends PreKey {
    signature: FixedBuffer64;

    toPod(): IndexedObject {
        let obj = super.toPod();
        obj.signature = this.signature?.serialize();
        return obj;
    }

    fromPod(obj: IndexedObject): boolean {
        return false;
    }
}

export class PendingPreKey implements IPodObject {
    preKeyId: number;

    signedKeyId: number;

    baseKey: KeyPair;

    toPod(): IndexedObject {
        return {};
    }

    fromPod(obj: IndexedObject): boolean {
        return false;
    }
}

export class Device implements IPodObject {

    identityKey: KeyPair;

    preKey: PreKey;

    signedPreKey: SignedPreKey;

    registrationId: number;

    toPod(): IndexedObject {
        return {
            identityKey: this.identityKey.toPod(),
            preKey: this.preKey.toPod(),
            signedPreKey: this.signedPreKey.toPod()
        };
    }

    fromPod(obj: IndexedObject): boolean {
        return false;
    }
}

export class Ratchet implements IPodObject {

    // 双方临时key
    ephemeralKeyPair: KeyPair;

    // HKDF[0]
    rootKey: FixedBuffer32;

    // createsession时使用的bob的signedkey
    lastRemoteEphemeralKey: KeyPair;

    previousCounter: number;
    timeAdded: number; // 添加的时间
    oldRatchetList: Ratchet[] = [];
    ephemeralKey: X25519Key;

    toPod(): IndexedObject {
        return {
            ephemeralKeyPair: this.ephemeralKeyPair.toPod(),
            rootKey: this.rootKey.serialize(),
            lastRemoteEphemeralKey: this.lastRemoteEphemeralKey.serialize(),
            previousCounter: this.previousCounter,
            oldRatchetList: ArrayT.Convert(this.oldRatchetList, e => {
                return e.toPod();
            })
        };
    }

    fromPod(obj: IndexedObject): boolean {
        return false;
    }
}

export class RatchetChain implements IPodObject {

    messageKeys = new Map<number, FixedBuffer32>();

    ephemeralKey: X25519Key;

    chainType: ChainType;

    chainCounter: number = -1;

    chainKey: FixedBuffer32;

    toPod(): IndexedObject {
        return {};
    }

    fromPod(obj: IndexedObject): boolean {
        return false;
    }
}

export class SessionIndexInfo implements IPodObject {

    // createsession时使用的bob的identitykey
    remoteIdentityKey: KeyPair;

    // session关闭时间
    timeClosed: number = -1;

    // 创建createsession时使用的临时key
    baseKey: KeyPair;

    // key的类型
    baseKeyType: BaseKeyType;

    toPod(): IndexedObject {
        return {};
    }

    fromPod(obj: IndexedObject): boolean {
        return false;
    }
}

export class Session implements IPodObject {
    registrationId: number;
    currentRatchet: Ratchet;
    chains = new Map<KeyHashType, RatchetChain>();
    indexInfo: SessionIndexInfo;
    // remoteEphemeralKeys = new Map<KeyHashType, X25519Key>();
    oldRatchetList: Ratchet[] = [];
    pendingPreKey: PendingPreKey;

    toPod(): IndexedObject {
        return {};
    }

    fromPod(obj: IndexedObject): boolean {
        return false;
    }
}

export class EncryptedMessage {
    type: number;
    body: string;
    registrationId: number;
}

export class DecryptedMessage {
    plaintext: string;
    session: Session;
}