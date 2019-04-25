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
