import nacl = require("tweetnacl");

export class Crypto {

    static GetRandomBytes(size: number): Uint8Array {
        return nacl.randomBytes(size);
    }

    static Encrypt() {

    }

    static Decrypt() {

    }

    static Sign() {

    }

    static async Hash(data: Uint8Array): Promise<Uint8Array> {
        return null;
    }

    static HKDF() {

    }

    static CreateKeyPair() {

    }

    static ECDHE() {

    }

    static Ed25519Sign() {

    }

    static Ed25519Verify() {

    }

    static VerifyMAC() {

    }

    static DeriveSecrets() {

    }

    static CalculateMAC() {

    }
}
