import crypto = require("crypto");
import nacl = require("tweetnacl");
import {BinaryLike} from "crypto";
import {Ed25519PrivateKey, Ed25519PublicKey, KeyPair, X25519Key} from "./model";
import {FixedBuffer32, FixedBuffer64} from "../../../core/buffer";

export class Crypto {

    static async Test() {
        console.log(crypto.getCiphers(), crypto.getHashes(), crypto.getCurves());
    }

    static GetRandomBytes(size: number): Buffer {
        return crypto.randomBytes(size);
    }

    static Encrypt(key: BinaryLike, data: Buffer, iv: BinaryLike): Buffer {
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
        r.pubKeyEd = new Ed25519PublicKey(kp.publicKey);
        r.privKeyEd = new Ed25519PrivateKey(kp.secretKey);
        r.pubKeyX = r.pubKeyEd.toX();
        r.privKeyX = r.privKeyEd.toX();

        return r;
    }

    static ECDHE(pubkey: X25519Key, prvkey: X25519Key): FixedBuffer32 {
        let res = nacl.box.before(pubkey.buffer, prvkey.buffer);
        return new FixedBuffer32(res);
    }

    static Ed25519Sign(prvkey: Ed25519PrivateKey, msg: Uint8Array): FixedBuffer64 {
        let buf = nacl.sign.detached(msg, prvkey.buffer);
        return new FixedBuffer64(buf);
    }

    static Ed25519Verify(pubkey: Ed25519PublicKey, msg: Uint8Array, sig: FixedBuffer64): boolean {
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
