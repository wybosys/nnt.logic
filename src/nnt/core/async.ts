import async = require("async");

export function SyncMap<K, V>(m: Map<K, V>): _SyncMap<K, V> {
    return new _SyncMap(m ? m : new Map<K, V>());
}

class _SyncMap<K, V> {

    constructor(map: Map<K, V>) {
        this._map = map;
    }

    private _map: Map<K, V>;

    async forEach(proc: (v: V, k: K) => Promise<boolean>): Promise<void> {
        let iter = this._map.entries();
        let cur = iter.next();
        while (!cur.done) {
            let val = cur.value;
            if (!await proc(val[1], val[0]))
                break;
            cur = iter.next();
        }
    }
}

export function SyncArray<T>(arr: T[]): _SyncArray<T> {
    return new _SyncArray(arr ? arr : []);
}

class _SyncArray<T> {

    constructor(arr: T[]) {
        this._arr = arr;
    }

    async forEach(proc: (e: T, idx: number) => Promise<void>): Promise<this> {
        for (let i = 0, l = this._arr.length; i < l; ++i) {
            await proc(this._arr[i], i);
        }
        return this;
    }

    async query(proc: (e: T, idx: number) => Promise<boolean>): Promise<T> {
        for (let i = 0, l = this._arr.length; i < l; ++i) {
            let v = this._arr[i];
            if (await proc(v, i))
                return v;
        }
        return null;
    }

    async querycvt<R>(proc: (e: T, idx: number) => Promise<R>): Promise<R> {
        for (let i = 0, l = this._arr.length; i < l; ++i) {
            let v = this._arr[i];
            let r = await proc(v, i);
            if (r)
                return r;
        }
        return null;
    }

    async convert<R>(proc: (e: T, idx: number) => Promise<R>, skipnull = false): Promise<R[]> {
        let r = new Array();
        for (let i = 0, l = this._arr.length; i < l; ++i) {
            let v = await proc(this._arr[i], i);
            if (skipnull && !v)
                continue;
            r.push(v);
        }
        return r;
    }

    private _arr: T[];
}

export function AsyncArray<T>(arr: T[]): _AsyncArray<T> {
    return new _AsyncArray(arr);
}

class _AsyncArray<T> {

    constructor(arr: T[]) {
        this._arr = arr;
    }

    forEach(proc: (e: T, done: () => void) => void): Promise<void> {
        return new Promise(resolve => {
            async.each(this._arr, (item, next) => {
                proc(item, next);
            }, resolve);
        });
    }

    convert<R>(cvt: (e: T, done: (obj: R) => void) => void): Promise<R[]> {
        return new Promise(resolve => {
            let r = new Array<R>();
            async.each(this._arr, (item, next) => {
                cvt(item, obj => {
                    r.push(obj);
                    next();
                });
            }, () => {
                resolve(r);
            });
        });
    }

    private _arr: T[];
}

export class Async {

    static Array<T>(arr: T[]): _PromiseArray<T> {
        return new _PromiseArray<T>(arr);
    }
}

class _PromiseArray<T> {

    constructor(arr: T[]) {
        this._arr = arr;
    }

    async forEach(cb: (e: T, idx: number) => Promise<void>) {
        for (let i = 0, l = this._arr.length; i < l; ++i) {
            await cb(this._arr[i], i);
        }
    }

    async queryObject(filter: (e: T, idx?: number) => Promise<boolean>): Promise<T> {
        if (this._arr) {
            for (let i = 0, l = this._arr.length; i < l; ++i) {
                let e = this._arr[i];
                if (await filter(e, i))
                    return e;
            }
        }
        return null;
    }

    async queryObjects(filter: (e: T, idx?: number) => Promise<boolean>): Promise<T[]> {
        let r = new Array<T>();
        if (this._arr) {
            for (let i = 0, l = this._arr.length; i < l; ++i) {
                let e = this._arr[i];
                if (await filter(e, i))
                    r.push(e);
            }
        }
        return r;
    }

    async convert<R>(to: (e: T, idx?: number) => Promise<R>, skipnull = false): Promise<R[]> {
        let r = new Array<R>();
        if (this._arr) {
            for (let i = 0, l = this._arr.length; i < l; ++i) {
                let e = this._arr[i];
                let t = await to(e, i);
                if (!t && skipnull)
                    continue;
                r.push(t);
            }
        }
        return r;
    }

    private _arr: T[];
}
