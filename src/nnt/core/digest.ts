import crypto = require("crypto");

export enum Format {
    BASE64,
    HEX
}

export function SHA1(str: string, fmt = Format.BASE64): string {
    let hdl = crypto.createHash('sha1').update(str);
    return fmt == Format.BASE64 ? hdl.digest().toString("base64") : hdl.digest("hex");
}

export function HMACSHA(str: string, key: string, typ = "sha1", fmt = Format.BASE64): string {
    let hdl = crypto.createHmac(typ, key).update(str);
    return fmt == Format.BASE64 ? hdl.digest().toString("base64") : hdl.digest("hex");
}

export function MD5(str: string, fmt = Format.BASE64): string {
    let hdl = crypto.createHash('md5').update(str);
    return fmt == Format.BASE64 ? hdl.digest().toString("base64") : hdl.digest("hex");
}
