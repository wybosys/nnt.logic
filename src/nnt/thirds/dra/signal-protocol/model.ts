import {FixedBuffer32, FixedBuffer64} from "../../../core/buffer";

export class KeyPair {

    // ed25519用于签名
    pubkey_ed: FixedBuffer32;
    prvkey_ed: FixedBuffer64;

    // x25519用于加密和dh
    pubkey_x: FixedBuffer32;
    prvkey_x: FixedBuffer32;

}

export class PreKey {
    keyId: number;
    keyPair: KeyPair;
}

export class SignedPreKey extends PreKey {
    signature: FixedBuffer32;
}