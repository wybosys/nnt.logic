import mime = require("mime-types");
import mmm = require('mmmagic');
import {logger} from "./logger";

const PAT = /^data:([0-9A-Za-z-+\/]+);base64,(.+)$/;

export class Base64File {
    type: string;
    buffer: Buffer;

    static Decode(cnt: string): Base64File {
        let res = cnt.match(PAT);
        if (!res || res.length != 3)
            return null;
        let r = new Base64File();
        r.type = res[1];
        r.buffer = new Buffer(res[2], "base64");
        return r;
    }

    static Encode(buf: Buffer, typ: string): string {
        return "data:" + typ + ";base64," + buf.toString("base64");
    }
}

export class Mime {

    static Type(path: string, def: string = null): string {
        let r: any = mime.lookup(path);
        if (r !== false)
            return r;
        if (path.endsWith("amr"))
            return "audio/amr";
        return def;
    }

    static Extension(typ: string, def: string = null): string {
        let r: any = mime.extension(typ);
        if (r !== false)
            return r;
        if (typ == "audio/amr")
            return "amr";
        return def;
    }

    static TypeOfFile(path: string, def: string = null): Promise<string> {
        return new Promise(resolve => {
            let h = new mmm.Magic(mmm.MAGIC_MIME_TYPE);
            h.detectFile(path, (err, res) => {
                if (err) {
                    logger.warn(err.message);
                    resolve(def);
                }
                else {
                    resolve(res);
                }
            });
        });
    }

    static TypeOfBuffer(buf: Buffer, def: string = null): Promise<string> {
        return new Promise(resolve => {
            let h = new mmm.Magic(mmm.MAGIC_MIME_TYPE);
            h.detect(buf, (err, res) => {
                if (err) {
                    logger.warn(err.message);
                    resolve(def);
                }
                else {
                    resolve(res);
                }
            });
        });
    }
}