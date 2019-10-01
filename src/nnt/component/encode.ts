import crypto = require("crypto");

export class Fast {

    constructor(key: string) {
        this._key = key;
    }

    get key(): string {
        return this._key;
    }

    set key(key: string) {
        this._key = key;
    }

    encode(str: string): string {
        let r: string;
        try {
            let hdl = crypto.createCipher("aes128", this._key);
            r = hdl.update(str, "utf8", "hex");
            r += hdl.final("hex");
        } catch (err) {
            //console.log(err);
        }
        return r;
    }

    decode(str: string): string {
        let r: string;
        try {
            let hdl = crypto.createDecipher("aes128", this._key);
            r = hdl.update(str, "hex", "utf8");
            r += hdl.final("utf8");
        } catch (err) {
            console.log(err);
        }
        return r;
    }

    private _key: string;
}