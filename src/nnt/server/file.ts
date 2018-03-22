import fs = require("fs");
import stm = require("streamifier");
import {Mime} from "../core/file";
import {DateTime} from "../core/time";

// 专用来返回的文件对象
export class RespFile {

    // 普通文件
    static Regular(file: string, typ?: string): RespFile {
        let r = new RespFile();
        if (!typ)
            typ = Mime.Type(file);
        r._file = file;
        r.type = typ;
        r._stat = fs.statSync(file);
        return r;
    }

    // 原始数据流
    static Buffer(buf: Buffer, typ?: string): RespFile {
        let r = new RespFile();
        r.type = typ;
        r._buf = buf;
        return r;
    }

    get length(): number {
        if (this._stat)
            return this._stat.size;
        if (this._buf)
            return this._buf.byteLength;
        return 0;
    }

    get readStream() {
        if (this._file)
            return fs.createReadStream(this._file);
        if (this._buf)
            return stm.createReadStream(this._buf);
        return null;
    }

    protected _file: string;
    protected _buf: Buffer;
    type: string;
    protected _stat: fs.Stats;

    get stat(): fs.Stats {
        return this._stat;
    }

    private _expire: Date;

    // 过期时间，默认为1年
    get expire(): Date {
        if (this._expire)
            return this._expire;
        this._expire = new Date();
        this._expire.setTime((DateTime.Now() + DateTime.YEAR) * 1000);
        return this._expire;
    }
}