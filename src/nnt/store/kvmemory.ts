import {AbstractKv} from "./kv";
import {Variant} from "../core/object";
import {IndexedObject} from "../core/kernel";
import {DbExecuteStat} from "./store";
import {logger} from "../core/logger";

export class KvMemory extends AbstractKv {

    async open() {
        logger.info("打开 {{=it.id}}@memory", {id: this.id});
    }

    async close() {
        // pass
    }

    get(key: string, cb: (res: Variant) => void) {
        cb(new Variant(this._obj[key]));
    }

    set(key: string, val: Variant, cb: (res: boolean) => void) {
        this._obj[key] = val.raw;
        cb(true);
    }

    getset(key: string, val: Variant, cb: (res: Variant) => void) {
        let prev = this._obj[key];
        this._obj[key] = val.raw;
        cb(new Variant(prev));
    }

    autoinc(key: string, delta: number, cb: (cb: number) => void) {
        let val = this._obj[key];
        if (typeof val != 'number') {
            this._obj[key] = 0;
            cb(0);
        } else {
            cb(this._obj[key] += delta);
        }
    }

    inc(key: string, delta: number, cb: (id: number) => void) {
        let val = this._obj[key];
        if (typeof val != 'number') {
            cb(null);
        } else {
            cb(this._obj[key] += delta);
        }
    }

    del(key: string, cb: (res: DbExecuteStat) => void) {
        if (key in this._obj) {
            delete this._obj[key];
            cb({remove: 1});
        } else {
            cb(null);
        }
    }

    private _obj: IndexedObject = Object.create(null);
}
