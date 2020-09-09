import crypto = require("crypto");
import nacl = require("tweetnacl");
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

    static async HKDF(input: Buffer, salt: Buffer, info: Buffer): Promise<Buffer[]> {
        if (salt.byteLength != 32) {
            throw new Error("Got salt of incorrect length");
        }

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

    static CreateKeyPair(prvkey?: Buffer): nacl.SignKeyPair {
        if (!prvkey) {
            return nacl.sign.keyPair();
        }
        return nacl.sign.keyPair.fromSecretKey(prvkey);
    }

    static ECDHE(pubkey: Uint8Array, prvkey: Uint8Array): Uint8Array {
        // return nacl.sign.before(pubkey, prvkey);
        return null;
    }

    static Ed25519Sign(seckey: Uint8Array, msg: Uint8Array): Uint8Array {
        return nacl.sign.detached(msg, seckey);
    }

    static Ed25519Verify(pubkey: Uint8Array, msg: Uint8Array, sig: Uint8Array): boolean {
        return nacl.sign.detached.verify(msg, sig, pubkey);
    }

    static VerifyMAC(data: Uint8Array, key: Uint8Array, mac: Uint8Array, length: number): boolean {
        let calculated_mac = Crypto.Sign(key, data);
        if (mac.byteLength != length || calculated_mac.byteLength < length) {
            // throw new Error("Bad MAC length");
            return false;
        }

        let a = new Uint8Array(calculated_mac);
        let b = mac;
        let result = 0;
        for (var i = 0; i < mac.byteLength; ++i) {
            result = result | (a[i] ^ b[i]);
        }

        if (result !== 0) {
            //throw new Error("Bad MAC");
            return false;
        }
        return true;
    }

    static DeriveSecrets(input: Buffer, salt: Buffer, info: Buffer) {
        return Crypto.HKDF(input, salt, info);
    }

    static CalculateMAC(key: Buffer, data: Buffer) {
        return Crypto.Sign(key, data);
    }
}
