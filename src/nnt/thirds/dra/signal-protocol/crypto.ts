import crypto = require("crypto");
import {BinaryLike} from "crypto";

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

    static Sign(key: BinaryLike, data: BinaryLike): Buffer {
        let dig = crypto.createHmac('sha256', key);
        let res = dig.update(data);
        return res.digest();
    }

    static Hash(data: string): Buffer {
        let hs = crypto.createHash('sha512');
        let res = hs.update(data);
        return res.digest();
    }

    static async HKDF(input: string, salt: string, info: Buffer): Promise<Buffer[]> {
        // Specific implementation of RFC 5869 that only returns the first 3 32-byte chunks
        // XTODO: We dont always need the third chunk, we might skip it
        let PRK = Crypto.Sign(salt, input);
        let infoBuffer = new Uint8Array(32 + info.byteLength + 1);
        let infoArray = new Uint8Array(infoBuffer);
        infoArray.set(new Uint8Array(info), 32);
        infoArray[infoArray.length - 1] = 1;
        let T1 = Crypto.Sign(PRK, infoBuffer.slice(32));
        infoArray.set(new Uint8Array(T1));
        infoArray[infoArray.length - 1] = 2;
        let T2 = Crypto.Sign(PRK, infoBuffer);
        infoArray.set(new Uint8Array(T2));
        infoArray[infoArray.length - 1] = 3;
        let T3 = Crypto.Sign(PRK, infoBuffer);
        return [T1, T2, T3];
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
