import {AbstractKv} from "./kv";
import level = require("level");
import {logger} from "../core/logger";
import {Variant} from "../core/object";
import {DbExecuteStat} from "./store";
import {Node} from "../config/config";
import tmp = require("tmp");

interface KvLevelNode {

    // 数据库保存的位置
    file?: string;
}

export class KvLevel extends AbstractKv {

    config(cfg: Node): boolean {
        super.config(cfg);
        let c: KvLevelNode = <any>cfg;
        if (c.file)
            this._file = c.file;
        return true;
    }

    async open() {
        if (!this._file)
            this._file = tmp.tmpNameSync();
        this._db = level(this._file);
        logger.info("打开 {{=it.id}}@level", {id: this.id});
    }

    async close() {
        this._db.close();
        this._db = null;
    }

    get(key: string, cb: (res: Variant) => void) {
        this._db.get(key, (err: Error, val: any) => {
            if (err) {
                //logger.error(err);
                cb(null);
            } else {
                cb(Variant.Unserialize(val));
            }
        });
    }

    set(key: string, val: Variant, cb: (res: boolean) => void) {
        this._db.put(key, val.serialize(), (err: Error) => {
            if (err) {
                logger.error(err);
                cb(false);
            } else {
                cb(true);
            }
        });
    }

    getset(key: string, val: Variant, cb: (res: Variant) => void) {
        this.get(key, old => {
            this.set(key, val, res => {
                cb(old);
            });
        });
    }

    autoinc(key: string, delta: number, cb: (cb: number) => void) {
        this._db.get(key, (err: Error, val: any) => {
            if (typeof val != 'number') {
                this._db.put(key, 0, () => {
                    cb(0);
                });
            } else {
                val += delta;
                this._db.put(key, val, () => {
                    cb(val);
                });
            }
        });
    }

    inc(key: string, delta: number, cb: (id: number) => void) {
        this._db.get(key, (err: Error, val: any) => {
            if (typeof val != 'number') {
                cb(null);
            } else {
                val += delta;
                this._db.put(key, val, () => {
                    cb(val);
                });
            }
        });
    }

    del(key: string, cb: (res: DbExecuteStat) => void) {
        this._db.del(key, (err: Error) => {
            if (err) {
                logger.error(err);
                cb(null);
            } else {
                cb({remove: 1});
            }
        });
    }

    private _db: any;
    private _file: string;
}
