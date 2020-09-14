import Hashids = require("hashids");
import {DateTime, Interval} from "../core/time";
import {StringT} from "../core/stringt";

export class IdHash {

    constructor(key?: string) {
        this._key = key;
        this._hdl = new Hashids(key);
    }

    encode(...val: number[]): string {
        return this._hdl.encode.apply(this._hdl, val);
    }

    encodev(val: number[]): string {
        return this._hdl.encode.apply(this._hdl, val);
    }

    get key(): string {
        return this._key;
    }

    set key(key: string) {
        if (this._key != key) {
            this._hdl = new Hashids(key);
            this._key = key;
        }
    }

    private _key: string;
    private _hdl: Hashids;
}

export class NormalHash {

    constructor(key?: string) {
        this._key = key;
    }

    digest(str: string): number {
        return StringT.Hash(this._key + str + this._key);
    }

    get key(): string {
        return this._key;
    }

    set key(key: string) {
        this._key = key;
    }

    private _key: string;
}

export class IntervalHash {

    constructor(interval: number) {
        this._tmr = new Interval(interval, () => {
            this._hdl.key = DateTime.Pass().toString();
        });
    }

    digest(str: string): number {
        return this._hdl.digest(str);
    }

    private _hdl = new NormalHash(DateTime.Pass().toString());
    private _tmr: Interval;
}