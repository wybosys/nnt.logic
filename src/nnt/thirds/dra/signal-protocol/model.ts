import {FixedUint8Array} from "../../../core/buffer";

export type X25519KeyType = FixedUint8Array<32>;
export type Ed25519PubKeyType = FixedUint8Array<32>;
export type Ed25519PrvKeyType = FixedUint8Array<64>;

export class KeyPair {

    // ed25519用于签名
    pubkey_ed: Ed25519PubKeyType;
    prvkey_ed: Ed25519PrvKeyType;

    // x25519用于加密和dh
    pubkey_x: X25519KeyType;
    prvkey_x: X25519KeyType;

}
