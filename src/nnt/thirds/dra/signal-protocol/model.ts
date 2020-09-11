import {FixedBuffer32, FixedBuffer33, FixedBuffer64} from "../../../core/buffer";

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