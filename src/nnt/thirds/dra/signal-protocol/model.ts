import {FixedBuffer32, FixedBuffer64, FixedBufferType} from "../../../core/buffer";
import {IndexedObject} from "../../../core/kernel";
import {IPodObject} from "../../../core/object";
import {ArrayT} from "../../../core/arrayt";
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
        // 不序列化私钥，x的公钥可以通过ed导出
        return {
            pubKeyEd: this.pubKeyEd.serialize()
        };
    }

    fromPod(obj: IndexedObject): this {
        this.pubKeyEd = new Ed25519PublicKey().deserialize(obj.pubKeyEd);
        this.pubKeyX = this.pubKeyEd.toX();
        return this;
    }

    isEqual(r: KeyPair): boolean {
        return this.pubKeyEd.isEqual(r.pubKeyEd);
    }
}

export class PreKey extends KeyPair {

    keyId: number;

    toPod(): IndexedObject {
        let obj = super.toPod();
        return {
            ...obj,
            keyId: this.keyId
        };
    }

    fromPod(obj: IndexedObject): this {
        super.fromPod(obj);
        this.keyId = obj.keyId;
        return this;
    }
}

export class SignedPreKey extends PreKey {

    signature: FixedBuffer64;

    toPod(): IndexedObject {
        let obj = super.toPod();
        return {
            ...obj,
            signature: this.signature?.serialize()
        };
    }

    fromPod(obj: IndexedObject): this {
        super.fromPod(obj);
        if (obj.signature)
            this.signature = new FixedBuffer64().deserialize(obj.signature);
        return this;
    }
}

export class PendingPreKey implements IPodObject {

    preKeyId: number;

    signedKeyId: number;

    baseKey: KeyPair;

    toPod(): IndexedObject {
        return {
            preKeyId: this.preKeyId,
            signedKeyId: this.signedKeyId,
            baseKey: this.baseKey.toPod()
        };
    }

    fromPod(obj: IndexedObject): this {
        this.preKeyId = obj.preKeyId;
        this.signedKeyId = obj.signedKeyId;
        this.baseKey = new KeyPair().fromPod(obj.baseKey);
        return this;
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
            signedPreKey: this.signedPreKey.toPod(),
            registrationId: this.registrationId
        };
    }

    fromPod(obj: IndexedObject): this {
        this.identityKey = new KeyPair().fromPod(obj.identityKey);
        this.preKey = new PreKey().fromPod(obj.preKey);
        this.signedPreKey = new SignedPreKey().fromPod(obj.signedPreKey);
        this.registrationId = obj.registrationId;
        return this;
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

    toPod(): IndexedObject {
        return {
            ephemeralKeyPair: this.ephemeralKeyPair.toPod(),
            rootKey: this.rootKey.serialize(),
            lastRemoteEphemeralKey: this.lastRemoteEphemeralKey.toPod(),
            previousCounter: this.previousCounter
        };
    }

    fromPod(obj: IndexedObject): this {
        this.ephemeralKeyPair = new KeyPair().fromPod(obj.ephemeralKeyPair);
        this.rootKey = new FixedBuffer32().deserialize(obj.rootKey);
        this.lastRemoteEphemeralKey = new KeyPair().fromPod(obj.lastRemoteEphemeralKey);
        this.previousCounter = obj.previousCounter;
        return this;
    }
}

export class OldRatchet implements IPodObject {

    timeAdded: number;

    ephemeralKey: KeyPair;

    toPod(): IndexedObject {
        return {
            timeAdded: this.timeAdded,
            ephemeralKey: this.ephemeralKey.toPod()
        };
    }

    fromPod(obj: IndexedObject): this {
        this.timeAdded = obj.timeAdded;
        this.ephemeralKey = new KeyPair().fromPod(obj.ephemeralKey);
        return this;
    }
}

export class RatchetChain implements IPodObject {

    messageKeys = new Map<number, FixedBuffer32>();

    chainType: ChainType;

    chainCounter: number = -1;

    chainKey: FixedBuffer32;

    toPod(): IndexedObject {
        let mks: IndexedObject = {};
        this.messageKeys.forEach((v, k) => {
            mks[k] = v.serialize();
        });
        return {
            messageKeys: mks,
            chainType: this.chainType,
            chainCounter: this.chainCounter,
            chainKey: this.chainKey.serialize()
        };
    }

    fromPod(obj: IndexedObject): this {
        this.messageKeys.clear();
        for (let k in obj.messageKeys) {
            let v = obj.messageKeys[k];
            this.messageKeys.set(<any>k, new FixedBuffer32().deserialize(v));
        }
        this.chainType = obj.chainType;
        this.chainCounter = obj.chainCounter;
        this.chainKey = new FixedBuffer32().deserialize(obj.chainKey);
        return this;
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
        return {
            remoteIdentityKey: this.remoteIdentityKey.toPod(),
            timeClosed: this.timeClosed,
            baseKey: this.baseKey.toPod(),
            baseKeyType: this.baseKeyType
        };
    }

    fromPod(obj: IndexedObject): this {
        this.remoteIdentityKey = new KeyPair().fromPod(obj.remoteIdentityKey);
        this.timeClosed = obj.timeClosed;
        this.baseKey = new KeyPair().fromPod(obj.baseKey);
        this.baseKeyType = obj.baseKeyType;
        return this;
    }
}

export class Session implements IPodObject {

    registrationId: number;

    currentRatchet: Ratchet;

    chains = new Map<KeyHashType, RatchetChain>();

    indexInfo: SessionIndexInfo;

    pendingPreKey: PendingPreKey;

    oldRatchetList: OldRatchet[] = [];

    toPod(): IndexedObject {
        let cs: IndexedObject = {};
        this.chains.forEach((v, k) => {
            cs[k] = v.toPod();
        });

        return {
            registrationId: this.registrationId,
            currentRatchet: this.currentRatchet.toPod(),
            chains: cs,
            indexInfo: this.indexInfo.toPod(),
            pendingPreKey: this.pendingPreKey.toPod(),
            oldRatchetList: ArrayT.Convert(this.oldRatchetList, e => {
                return e.toPod();
            })
        };
    }

    fromPod(obj: IndexedObject): this {
        this.registrationId = obj.registrationId;
        this.currentRatchet = new Ratchet().fromPod(obj.currentRatchet);

        this.chains.clear();
        for (let k in obj.chains) {
            let v = obj.chains[k];
            this.chains.set(<any>k, new RatchetChain().fromPod(v));
        }

        this.indexInfo = new SessionIndexInfo().fromPod(obj.indexInfo);
        this.pendingPreKey = new PendingPreKey().fromPod(obj.pendingPreKey);
        this.oldRatchetList = ArrayT.Convert(obj.oldRatchetList, e => {
            return new OldRatchet().fromPod(e);
        });
        return this;
    }
}

// 加密成功后的信息
export class EncryptedMessage {
    type: number;
    body: Buffer;
    registrationId: number;
}

// 解密信息
export class DecryptedMessage {
    plaintext: Buffer;
    session: Session;
}