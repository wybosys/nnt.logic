import {FixedBuffer32, FixedBuffer64, FixedBufferType} from "../../../core/buffer";
import {ArrayT, IndexedObject} from "../../../core/kernel";
import {BaseKeyType, ChainType} from "./sessionrecord";
import {IPodObject} from "../../../core/object";
import ed2curve = require("ed2curve");

export class ErrorExt extends Error {

    constructor(e: any) {
        super(e);
    }

    identityKey: FixedBuffer32;
}

export class Ed25519PublicKey extends FixedBuffer32 {

    constructor(buf?: FixedBufferType) {
        super(buf);
    }

    toString() {
        return super.toString('binary');
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

    toString() {
        return super.toString('binary');
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

    toString() {
        return super.toString('binary');
    }

    _x25519: any;
}

export class KeyPair implements IPodObject {

    // ed25519用于签名
    pubKeyEd: Ed25519PublicKey;
    privKeyEd: Ed25519PrivateKey;

    // x25519用于加密和dh
    pubKeyX: X25519Key;
    privKeyX: X25519Key;

    toPod(): IndexedObject {
        return {
            pubKeyEd: this.pubKeyEd?.serialize(),
            privKeyEd: this.privKeyEd?.serialize(),
            pubKeyX: this.pubKeyX?.serialize(),
            privKeyX: this.privKeyX?.serialize()
        };
    }

    fromPod(obj: IndexedObject): boolean {
        return false;
    }
}

export class PreKey implements IPodObject {
    keyId: number;
    keyPair: KeyPair;

    toPod(): IndexedObject {
        return {
            keyId: this.keyId,
            keyPair: this.keyPair.toPod()
        };
    }

    fromPod(obj: IndexedObject): boolean {
        return false;
    }
}

export class SignedPreKey extends PreKey {
    signature: FixedBuffer32;

    toPod(): IndexedObject {
        let obj = super.toPod();
        obj.signature = this.signature?.serialize();
        return obj;
    }

    fromPod(obj: IndexedObject): boolean {
        return false;
    }
}

export type IdentityKeyPair = KeyPair;

export class DeviceKey implements IPodObject {

    identityKey: Ed25519PublicKey;
    preKey: PreKey;
    signedPreKey: SignedPreKey;

    toPod(): IndexedObject {
        return {
            identityKey: this.identityKey?.serialize(),
            preKey: this.preKey.toPod(),
            signedPreKey: this.signedPreKey.toPod()
        };
    }

    fromPod(obj: IndexedObject): boolean {
        return false;
    }
}

export class Ratchet implements IPodObject {
    ephemeralKeyPair: KeyPair;
    rootKey: FixedBuffer32;
    lastRemoteEphemeralKey: FixedBuffer32;
    previousCounter: number;
    added: number;
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
    ephemeralKey: X25519Key;
    messageKeys: IndexedObject = {};
    chainType: ChainType;
    chainKey: {
        counter: number;
        key: FixedBuffer32;
    };

    toPod(): IndexedObject {
        return {};
    }

    fromPod(obj: IndexedObject): boolean {
        return false;
    }
}

export class SessionIndexInfo implements IPodObject {
    remoteIdentityKey: FixedBuffer32;
    timeClosed: number = -1; // 关闭时间
    baseKey: X25519Key;
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
    chains = new Map<string, RatchetChain>();
    indexInfo: SessionIndexInfo;
    remoteEphemeralKeys = new Map<string, X25519Key>();
    oldRatchetList: Ratchet[] = [];

    toPod(): IndexedObject {
        return {};
    }

    fromPod(obj: IndexedObject): boolean {
        return false;
    }
}
