import crypto = require("crypto");
import nacl = require("tweetnacl");
import ed2curve = require("ed2curve");
import {BinaryLike} from "crypto";
import {KeyPair} from "./model";
import {FixedBuffer32, FixedBuffer64} from "../../../core/buffer";

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

    static Sign(key: BinaryLike, data: BinaryLike): FixedBuffer32 {
        let dig = crypto.createHmac('sha256', key);
        let res = dig.update(data);
        return new FixedBuffer32(res.digest());
    }

    static Hash(data: BinaryLike): Buffer {
        let hs = crypto.createHash('sha512');
        let res = hs.update(data);
        return res.digest();
    }

    static HKDF(input: BinaryLike, salt: FixedBuffer32, info: Buffer): FixedBuffer32[] {
        // Specific implementation of RFC 5869 that only returns the first 3 32-byte chunks
        // XTODO: We dont always need the third chunk, we might skip it
        let PRK = Crypto.Sign(salt.buffer, input);
        let infoBuffer = new Uint8Array(32 + info.byteLength + 1);
        let infoArray = new Uint8Array(infoBuffer);
        infoArray.set(new Uint8Array(info), 32);
        infoArray[infoArray.length - 1] = 1;
        let T1 = Crypto.Sign(PRK.buffer, infoBuffer.slice(32));
        infoArray.set(T1.buffer);
        infoArray[infoArray.length - 1] = 2;
        let T2 = Crypto.Sign(PRK.buffer, infoBuffer);
        infoArray.set(T2.buffer);
        infoArray[infoArray.length - 1] = 3;
        let T3 = Crypto.Sign(PRK.buffer, infoBuffer);
        return [T1, T2, T3];
    }

    static CreateKeyPair(): KeyPair {
        let kp = nacl.sign.keyPair();

        let r = new KeyPair();
        r.pubKeyEd = new FixedBuffer32(kp.publicKey);
        r.privKeyEd = new FixedBuffer64(kp.secretKey);
        r.pubKeyX = new FixedBuffer32(ed2curve.convertPublicKey(kp.publicKey));
        r.privKeyX = new FixedBuffer32(ed2curve.convertSecretKey(kp.secretKey));

        return r;
    }

    static ECDHE(pubkey: FixedBuffer32, prvkey: FixedBuffer32): FixedBuffer32 {
        let res = nacl.box.before(pubkey.buffer, prvkey.buffer);
        return new FixedBuffer32(res);
    }

    static Ed25519Sign(prvkey: FixedBuffer64, msg: Uint8Array): FixedBuffer32 {
        let buf = nacl.sign.detached(msg, prvkey.buffer);
        return new FixedBuffer32(buf);
    }

    static Ed25519Verify(pubkey: FixedBuffer32, msg: Uint8Array, sig: FixedBuffer32): boolean {
        return nacl.sign.detached.verify(msg, sig.buffer, pubkey.buffer);
    }

    static VerifyMAC(data: Uint8Array, key: Uint8Array, mac: Uint8Array, length: number): boolean {
        let calculated_mac = Crypto.Sign(key, data);
        if (mac.byteLength != length || calculated_mac.byteLength < length) {
            console.error("dra: Bad MAC length");
            return false;
        }

        let a = new Uint8Array(calculated_mac);
        let b = mac;
        let result = 0;
        for (var i = 0; i < mac.byteLength; ++i) {
            result = result | (a[i] ^ b[i]);
        }

        if (result !== 0) {
            console.log("dra: Bad MAC");
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
