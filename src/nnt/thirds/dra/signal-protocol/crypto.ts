import nacl = require("tweetnacl");

export class Crypto {

    static GetRandomBytes(size: number): Uint8Array {
        return nacl.randomBytes(size);
    }

    static Encrypt(key: Uint8Array, data: Uint8Array, iv: number) {

    }

    static Decrypt(key: Uint8Array, data: Uint8Array, iv: number) {

    }

    static async Sign(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
        return null;
    }

    static async Hash(data: Uint8Array): Promise<Uint8Array> {
        return null;
    }

    static async HKDF(input: Uint8Array, salt: Uint8Array, info: string): Promise<any[]> {
        return null;
    }

    static async CreateKeyPair(prvkey?: Uint8Array): Promise<any> {
        return null;
    }

    static async ECDHE(pubkey: Uint8Array, prvkey: Uint8Array): Promise<Uint8Array> {
        return null;
    }

    static Ed25519Sign(prvkey: Uint8Array, msg: string) {

    }

    static Ed25519Verify(pubkey: Uint8Array, msg: string, sig: Uint8Array) {

    }

    static VerifyMAC(data: Uint8Array, key: Uint8Array, mac: Uint8Array, length: number) {

    }

    static DeriveSecrets(input: Uint8Array, salt: Uint8Array, info: string) {

    }

    static CalculateMAC(key: Uint8Array, data: Uint8Array) {

    }
}
