import crypto = require("crypto");

export function UpcaseFirst(str: string): string {
    if (!str || !str.length)
        return "";
    return str[0].toUpperCase() + str.substr(1);
}

export enum Format {
    BASE64,
    HEX
}

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

export class StringDigest {

    static SHA1(str: string, fmt = Format.BASE64): string {
        let hdl = crypto.createHash('sha1').update(str);
        return fmt == Format.BASE64 ? hdl.digest().toString("base64") : hdl.digest("hex");
    }

    static HMACSHA(str: string, key: string, typ = "sha1", fmt = Format.BASE64): string {
        let hdl = crypto.createHmac(typ, key).update(str);
        return fmt == Format.BASE64 ? hdl.digest().toString("base64") : hdl.digest("hex");
    }

    static MD5(str: string, fmt = Format.BASE64): string {
        let hdl = crypto.createHash('md5').update(str);
        return fmt == Format.BASE64 ? hdl.digest().toString("base64") : hdl.digest("hex");
    }
}