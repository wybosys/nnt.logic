import {FixedBuffer32, FixedBuffer33, FixedBuffer64} from "../../../core/buffer";
import {IndexedObject} from "../../../core/kernel";
import {BaseKeyType, ChainType} from "./sessionrecord";

export class KeyPair {

    // ed25519用于签名
    pubKeyEd: FixedBuffer32;
    privKeyEd: FixedBuffer64;

    // x25519用于加密和dh
    pubKeyX: FixedBuffer32;
    privKeyX: FixedBuffer32;

}

export class PreKey {
    keyId: number;
    keyPair: KeyPair;
}

export class SignedPreKey extends PreKey {
    signature: FixedBuffer32;
}

export class IdentityKeyPair {
    pubKeyEd: FixedBuffer32;
    privKeyEd: FixedBuffer64;

    pubKeyX: FixedBuffer33;
    privKeyX: FixedBuffer32;
}

export class DeviceKey {
    identityKey: FixedBuffer32;
    preKey: PreKey;
    signedPreKey: SignedPreKey;
}

export class Ratchet {
    ephemeralKeyPair: KeyPair;
    rootKey: FixedBuffer32;
    lastRemoteEphemeralKey: FixedBuffer32;
    previousCounter: number;
    oldRatchetList: Ratchet[] = [];
}

export class RatchetChain {
    messageKeys: IndexedObject = {};
    chainType: ChainType;
    chainKey: {
        counter: number;
        key: FixedBuffer32;
    };
}

export class SessionIndexInfo {
    remoteIdentityKey: FixedBuffer32;
    closed: number;
    baseKey: FixedBuffer32;
    baseKeyType: BaseKeyType;
}

export class Session {
    registrationId: number;
    currentRatchet: Ratchet;
    chains = new Map<string, RatchetChain>();
    indexInfo: SessionIndexInfo;
}