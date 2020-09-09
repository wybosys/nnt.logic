import crypto = require("crypto");

export class Crypto {

    static async Test() {
        console.log(crypto.getCiphers(), crypto.getHashes(), crypto.getCurves());
    }

    static GetRandomBytes(size: number): Buffer {
        return crypto.randomBytes(size);
    }

    static Encrypt(key: string, data: string, iv: string): Buffer {
        let cip = crypto.createCipheriv('aes-128-cbc', key, iv);
        let b0 = cip.update(data);
        let b1 = cip.final();
        return Buffer.concat([b0, b1]);
    }

    static Decrypt(key: string, data: Buffer, iv: string): string {
        let cip = crypto.createDecipheriv('aes-128-cbc', key, iv);
        let b0 = cip.update(data);
        let b1 = cip.final();
        return Buffer.concat([b0, b1]).toString('utf8');
    }

    static Sign(key: string, data: string): Buffer {
        let dig = crypto.createHmac('sha256', key);
        let res = dig.update(data);
        return res.digest();
    }

    static Hash(data: string): Buffer {
        let hs = crypto.createHash('sha512');
        let res = hs.update(data);
        return res.digest();
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
