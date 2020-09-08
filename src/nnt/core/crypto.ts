import crypto = require("crypto");


const ECB = 'des-ecb';
const CBC = 'des-cbc';

export class StringCrypto {

    constructor(key: string, iv: number = 0) {
        this._key = new Buffer(key);
        this._iv = new Buffer(iv);
    }

    encode(plain: string): string {
        let crt = crypto.createCipheriv(ECB, this._key, this._iv);
        crt.setAutoPadding(true);
        let buf = crt.update(plain, "utf8", "base64");
        buf += crt.final("base64");
        return buf;
    }

    decode(text: string): string {
        let crt = crypto.createDecipheriv(ECB, this._key, this._iv);
        crt.setAutoPadding(true);
        let buf = crt.update(text, "base64", "utf8");
        buf += crt.final("utf8");
        return buf;
    }

    private _key: Buffer;
    private _iv: Buffer;
}
