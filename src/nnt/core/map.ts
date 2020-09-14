import {ArrayT} from "./arrayt";

// 一个key多个value
export class Multimap<K, V> {

    get(k: K): Array<V> {
        return this._store.get(k);
    }

    set(k: K, arr: V[]) {
        this._store.set(k, arr);
    }

    push(k: K, v: V) {
        let arr = this._store.get(k);
        if (arr == null) {
            arr = new Array<V>();
            this._store.set(k, arr);
        }
        arr.push(v);
    }

    pop(k: K, v: V) {
        let arr = this._store.get(k);
        if (arr == null)
            return;
        ArrayT.RemoveObject(arr, v);
        if (arr.length == 0)
            this._store.delete(k);
    }

    has(k: K): boolean {
        return this._store.has(k);
    }

    contains(k: K, v: V): boolean {
        let arr = this._store.get(k);
        if (arr == null || !arr.length)
            return false;
        return arr.indexOf(v) != -1;
    }

    forEach(proc: (vs: V[], k: K) => void) {
        this._store.forEach(proc);
    }

    clear() {
        this._store.clear();
    }

    keys(): Iterator<K> {
        return this._store.keys();
    }

    entries(): Iterator<[K, Array<V>]> {
        return this._store.entries();
    }

    private _store = new Map<K, Array<V>>();
}

export class UniqueMultiMap<K, V> {

    get(key: K): Set<V> {
        return this._store.get(key);
    }

    push(key: K, v: V) {
        let arr = this._store.get(key);
        if (arr == null) {
            arr = new Set<V>();
            this._store.set(key, arr);
        }
        arr.add(v);
    }

    clear() {
        this._store.clear();
    }

    keys(): Iterator<K> {
        return this._store.keys();
    }

    entries(): Iterator<[K, Set<V>]> {
        return this._store.entries();
    }

    private _store = new Map<K, Set<V>>();
}

// 每一层都只有多个key，用来组织多层查询，最后一层都是value
export class LayerMap<K, V> {

    forEach(proc: (v: V, ...keys: K[]) => void) {
        this.doForEach(proc);
    }

    private doForEach(proc: (v: V, ...keys: K[]) => void, kpath = new Array()) {
        let cur: LayerMap<K, V> = this;
        cur._store.forEach((v, k) => {
            let kp = kpath.concat([k]);
            if (v._values) {
                v._values.forEach(e => {
                    proc.apply(this, [e].concat(kp));
                });
            }
            v.doForEach(proc, kp);
        });
    }

    has(...keys: K[]): boolean {
        let cur: LayerMap<K, V> = this;
        for (let i = 0, l = keys.length; i < l; ++i) {
            let k = keys[i];
            let fnd = cur._store.get(k);
            if (fnd == null)
                return false;
            cur = fnd;
        }
        return true;
    }

    set(value: V, ...keys: K[]) {
        let vals: Array<V>;
        let cur: LayerMap<K, V> = this;
        for (let i = 0, l = keys.length; i < l; ++i) {
            let k = keys[i];
            let fnd = cur._store.get(k);
            if (fnd == null) {
                fnd = new LayerMap<K, V>();
                cur._store.set(k, fnd);
            }
            cur = fnd;
        }
        if (cur._values == null)
            cur._values = new Array<V>();
        cur._values.push(value);
    }

    // 设置唯一
    setuq(value: V, ...keys: K[]) {
        let vals: Array<V>;
        let cur: LayerMap<K, V> = this;
        for (let i = 0, l = keys.length; i < l; ++i) {
            let k = keys[i];
            let fnd = cur._store.get(k);
            if (fnd == null) {
                fnd = new LayerMap<K, V>();
                cur._store.set(k, fnd);
            }
            cur = fnd;
        }
        if (cur._values == null)
            cur._values = new Array<V>();
        cur._values[0] = value;
    }

    get(...keys: K[]): Array<V> {
        let cur: LayerMap<K, V> = this;
        for (let i = 0, l = keys.length; i < l; ++i) {
            let k = keys[i];
            let fnd = cur._store.get(k);
            if (fnd == null)
                return null;
            cur = fnd;
        }
        return cur._values;
    }

    getuq(...keys: K[]): V {
        let cur: LayerMap<K, V> = this;
        for (let i = 0, l = keys.length; i < l; ++i) {
            let k = keys[i];
            let fnd = cur._store.get(k);
            if (fnd == null)
                return null;
            cur = fnd;
        }
        return cur._values[0];
    }

    keys(...keys: K[]): Iterator<K> {
        let cur: LayerMap<K, V> = this;
        for (let i = 0, l = keys.length; i < l; ++i) {
            let k = keys[i];
            let fnd = cur._store.get(k);
            if (fnd == null)
                return null;
            cur = fnd;
        }
        return cur._store.keys();
    }

    entries(...keys: K[]): Iterator<[number, V]> {
        let cur: LayerMap<K, V> = this;
        for (let i = 0, l = keys.length; i < l; ++i) {
            let k = keys[i];
            let fnd = cur._store.get(k);
            if (fnd == null)
                return null;
            cur = fnd;
        }
        return cur._values ? cur._values.entries() : null;
    }

    clear() {
        this._store.clear();
        this._values = null;
    }

    delete(...keys: K[]) {
        let cur: LayerMap<K, V> = this;
        for (let i = 0, l = keys.length; i < l; ++i) {
            let k = keys[i];
            let fnd = cur._store.get(k);
            if (fnd == null)
                return;
            cur = fnd;
        }
        cur._store.clear();
        cur._values = null;
    }

    deleteuq(...keys: K[]) {
        let cur: LayerMap<K, V> = this;
        for (let i = 0, l = keys.length; i < l; ++i) {
            let k = keys[i];
            let fnd = cur._store.get(k);
            if (fnd == null)
                return;
            cur = fnd;
        }
        cur._values[0] = null;
    }

    private _store = new Map<K, LayerMap<K, V>>();
    private _values: Array<V>;
}

export type KeyType = number | string | any;

// 多标签Map，多索引的对象，往往K不是同一种类型，所以不传K的定义
export class KeysMap<V> {

    // 从对象的多个参数生成key
    insert(obj: any, key: KeyType, ...keys: KeyType[]): this {
        this.set(key, obj);
        keys.forEach(e => {
            this.set(obj[e], obj);
        });
        return this;
    }

    set(k: KeyType, v: V): this {
        let fnd = ArrayT.QueryObject(this._keys, e => {
            return !e.has(k);
        });
        if (!fnd) {
            fnd = new Map<any, V>();
            fnd.set(k, v);
            this._keys.push(fnd);
        }
        let ref = this._valuerefs.get(v);
        if (!ref) {
            this._values.push(v);
            this._valuerefs.set(v, 1);
        } else {
            this._valuerefs.set(v, ref + 1);
        }
        return this;
    }

    delete(k: KeyType): this {
        this._keys.forEach(e => {
            if (e.has(k)) {
                let fnd = e.get(k);
                e.delete(k);
                // 清除对应的value
                let ref = this._valuerefs.get(fnd);
                if (ref == 1) {
                    ArrayT.RemoveObject(this._values, fnd);
                    this._valuerefs.delete(fnd);
                } else {
                    this._valuerefs.set(fnd, ref - 1);
                }
            }
        });
        return this;
    }

    private _values = new Array<V>();
    private _keys = new Array<Map<KeyType, V>>();
    private _valuerefs = new Map<V, number>();
}

export class IndexedMap<K, V> {

    set(k: K, v: V) {
        if (this._map.has(k)) {
            this._map.set(k, v);
            let idx = this._keys.indexOf(k);
            this._keys[idx] = k;
            this._vals[idx] = v;
        } else {
            this._map.set(k, v);
            this._keys.push(k);
            this._vals.push(v);
        }
    }

    get(k: K): V {
        return this._map.get(k);
    }

    clear() {
        this._map.clear();
        this._keys.length = 0;
        this._vals.length = 0;
    }

    get size(): number {
        return this._map.size;
    }

    delete(k: K) {
        if (!this._map.has(k))
            return;
        this._map.delete(k);
        let idx = this._keys.indexOf(k);
        ArrayT.RemoveObjectAtIndex(this._keys, idx);
        ArrayT.RemoveObjectAtIndex(this._vals, idx);
    }

    forEach(proc: (v: V, k: K) => void) {
        this._map.forEach(proc);
    }

    allKeys(): K[] {
        return this._keys;
    }

    allValues(): V[] {
        return this._vals;
    }

    private _map = new Map<K, V>();
    private _keys = new Array<K>();
    private _vals = new Array<V>();
}
