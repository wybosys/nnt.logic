import fs = require("fs");
import dotpl = require("dot");
import async = require("async");
import G = require("generatorics");
import {logger} from "./logger";
import {vsprintf} from "sprintf-js";

export type Class<T> = { new(...args: any[]): T, [key: string]: any };
export type AnyClass = Class<any>;
export type IndexedObject = { [key: string]: any };
export type KvObject<V> = { [key: string]: V };
export type PodType = number | string | boolean;

export function ispod(v: any): boolean {
    let typ = typeof v;
    return v == "number" || v == "string" || v == "boolean";
}

// 创建一个纯Json对象
export function JsonObject<T>(): T {
    return Object.create(null);
}

export function ToObject(obj: any, proc?: (obj: any) => any): any {
    if (!obj)
        return null;
    if (obj instanceof Array) {
        let r = new Array();
        obj.forEach(e => {
            r.push(ToObject(e));
        });
        return r;
    }
    if (obj instanceof Map) {
        let r: IndexedObject = {};
        obj.forEach((v, k) => {
            r[k] = ToObject(v);
        });
        return r;
    }
    return proc ? proc(obj) : obj;
}

export function Instance<T, R>(cls: Class<T>, cb: (obj: T) => void, ret?: (obj: T) => R): R {
    let t = new cls();
    cb(t);
    if (ret)
        return ret(t);
    return <any>t;
}

export function Self<T>(obj: T, cb: (obj: T) => void): T {
    cb(obj);
    return obj;
}

// 生成IndexedObject
// args (key,value)+，如果是奇数，则0下标的为给特定的object增加kv
// 常用来构造key为变量的IndexedObject
export function indexed(...args: any[]): IndexedObject {
    let r: IndexedObject;
    let lb: number;
    if (args.length % 2) {
        r = args[0];
        lb = 1;
    }
    else {
        r = {};
        lb = 0;
    }
    for (let i = lb, l = args.length; i < l; i += 2) {
        let k = args[i];
        let v = args[i + 1];
        r[k] = v;
    }
    return r;
}

export function indexed_safe(...args: any[]): IndexedObject {
    let r: IndexedObject;
    let lb: number;
    if (args.length % 2) {
        r = args[0];
        lb = 1;
    }
    else {
        r = {};
        lb = 0;
    }
    for (let i = lb, l = args.length; i < l; i += 2) {
        let k = args[i];
        let v = args[i + 1];
        if (k == null || v == null)
            continue;
        r[k] = v;
    }
    return r;
}

/** 三态 bool */
export type tribool = number;
export let tritrue = 1; // 类同于 true
export let trifalse = 0; // 类同于 false
export let trimay = 2; // 第三个中间状态

/** 基础数字＋字符串 */
export type numstr = number | string | any;

/** JSONOBJ+字符串 */
export type jsonobj = string | IndexedObject;

export interface pair<K, V> {
    k: K,
    v: V
};

export type tuple<A, B> = { 0: A, 1: B };
export type tuple2<A, B> = { 0: A, 1: B };
export type tuple3<A, B, C> = { 0: A, 1: B, 2: C };
export type tuple4<A, B, C, D> = { 0: A, 1: B, 2: C, 3: D };

export function make_tuple<A, B>(a: A, b: B): tuple<A, B> {
    return {0: a, 1: b};
}

export function make_tuple2<A, B>(a: A, b: B): tuple<A, B> {
    return {0: a, 1: b};
}

export function make_tuple3<A, B, C>(a: A, b: B, c: C): tuple3<A, B, C> {
    return {0: a, 1: b, 2: c};
}

export function make_tuple4<A, B, C, D>(a: A, b: B, c: C, d: D): tuple4<A, B, C, D> {
    return {0: a, 1: b, 2: c, 3: d};
}

export function use<T>(v: T, proc: (v: T) => void) {
    proc(v);
}

function _istuple(obj: any, len = 2): boolean {
    if (!(typeof obj == "object"))
        return false;
    for (let i = 0; i < len; ++i) {
        if (obj.hasOwnProperty(i) == false)
            return false;
    }
    return true;
}

export function IsTuple(obj: any): boolean {
    return _istuple(obj, 2);
}

export function IsTuple3(obj: any): boolean {
    return _istuple(obj, 3);
}

export function IsTuple4(obj: any): boolean {
    return _istuple(obj, 4);
}

export interface IClonable<T> {
    clone(): T;
}

export interface ICopyable<T> {
    // 从入参拷贝到本体
    copy(r: T): boolean;
}

export interface INumber {
    toNumber(): number;
}

export interface IString {
    toString(): string;
}

export function IsEmpty(o: any): boolean {
    if (o == null)
        return true;
    let tp = typeof(o);
    if (tp == 'string') {
        if (tp.length == 0)
            return true;
        return o.match(/^\s*$/) != null;
    }
    else if (tp == "boolean") {
        return false;
    }
    else if (tp == "number") {
        return false;
    }
    if (o instanceof Array) {
        return (<any>o).length == 0;
    }
    if (o instanceof Map) {
        return o.size != 0;
    }
    if (o instanceof Set) {
        return o.size != 0;
    }
    return Object.keys(o).length == 0;
}

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
        }
        else {
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
                }
                else {
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

export class ArrayT {

    static Allocate<T>(len: number, obj: () => T): T[] {
        let r = new Array<T>();
        while (len--) {
            r.push(obj());
        }
        return r;
    }

    static Merge<T>(...arr: Array<Array<T>>): T[] {
        let r = new Array<T>();
        arr && arr.forEach(e => {
            if (e)
                r = r.concat(e);
        });
        return r;
    }

    static Pack<T, R>(arr: T[], proc: (e: T, idx: number) => R, skipnull = true): R[] {
        let r = new Array();
        arr && arr.forEach((e, idx) => {
            let t = proc(e, idx);
            if (skipnull && t == null)
                return;
            r.push(t);
        });
        return r;
    }

    static Each<T>(arr: T[], proc: (e: T, idx: number) => boolean): boolean {
        if (arr) {
            for (let i = 0, l = arr.length; i < l; ++i) {
                if (!proc(arr[i], i))
                    return false;
            }
        }
        return true;
    }

    static async EachAsync<T>(arr: T[], proc: (e: T, idx: number) => Promise<boolean>): Promise<boolean> {
        if (arr) {
            for (let i = 0, l = arr.length; i < l; ++i) {
                if (!await proc(arr[i], i))
                    return false;
            }
        }
        return true;
    }

    static Sum<T>(arr: T[], proc: (e: T, idx: number) => number): number {
        let r = 0;
        arr.forEach((e, idx) => {
            let v = proc(e, idx);
            if (!v)
                v = 0;
            if (idx == 0)
                r = v;
            else
                r += v;
        });
        return r;
    }

    static Max<T, V>(arr: T[], proc: (e: T, idx: number) => V): T {
        let cur: V;
        let obj: T;
        arr.forEach((e, idx) => {
            if (idx == 0) {
                cur = proc(e, idx);
                obj = e;
                return;
            }
            let t = proc(e, idx);
            if (ObjectT.Compare(cur, t) == COMPARERESULT.LESS) {
                cur = t;
                obj = e;
            }
        });
        return obj;
    }

    static Min<T, V>(arr: T[], proc: (e: T, idx: number) => V): T {
        let cur: V;
        let obj: T;
        arr.forEach((e, idx) => {
            if (idx == 0) {
                cur = proc(e, idx);
                obj = e;
                return;
            }
            let t = proc(e, idx);
            if (ObjectT.Compare(t, cur) == COMPARERESULT.LESS) {
                cur = t;
                obj = e;
            }
        });
        return obj;
    }

    static Clear<T>(arr: T[], proc: (e: T, idx: number) => void) {
        arr.forEach(proc);
        arr.length = 0;
    }

    static ToObject(...kvs: any[]): IndexedObject {
        let r: IndexedObject = {};
        for (let i = 0, l = kvs.length; i < l; i += 2) {
            r[kvs[i]] = kvs[i + 1];
        }
        return r;
    }

    /** 插入元素 */
    static InsertObjectAtIndex<T>(arr: T[], o: T, idx: number) {
        arr.splice(idx, 0, o);
    }

    static QueryObject<T>(arr: Array<T>, filter: (e: T, idx?: number) => boolean): T {
        if (arr)
            for (let i = 0, l = arr.length; i < l; ++i) {
                let e = arr[i];
                if (filter(e, i))
                    return e;
            }
        return null;
    }

    static QueryObjects<T>(arr: Array<T>, filter: (e: T, idx?: number) => boolean): Array<T> {
        let r = new Array<T>();
        arr && arr.forEach((e, idx) => {
            if (filter(e, idx))
                r.push(e);
        });
        return r;
    }

    /** 查询条件对应的索引 */
    static QueryIndex<T>(arr: T[], fun: (o: T, idx?: number) => boolean, ctx?: any, def?: number): number {
        let r = def;
        arr.some((o: T, idx: number): boolean => {
            if (fun.call(ctx, o, idx)) {
                r = idx;
                return true;
            }
            return false;
        }, this);
        return r;
    }

    static Convert<T, R>(arr: Array<T>, to: (e: T, idx?: number) => R, skipnull = false): Array<R> {
        let r = new Array<R>();
        arr && arr.forEach((e, idx) => {
            let t = to(e, idx);
            if (!t && skipnull)
                return;
            r.push(t);
        });
        return r;
    }

    static async ConvertAsync<T, R>(arr: Array<T>, to: (e: T, idx?: number) => Promise<R>, skipnull = false): Promise<Array<R>> {
        let r = new Array<R>();
        if (arr) {
            for (let i = 0, l = arr.length; i < l; ++i) {
                let t = await to(arr[i], i);
                if (!t && skipnull)
                    continue;
                r.push(t);
            }
        }
        return r;
    }

    static Random<T>(arr: T[]): T {
        if (!arr || arr.length == 0)
            return null;
        return arr[Random.Rangei(0, arr.length)];
    }

    static RandomPop<T>(arr: T[]): T {
        if (!arr || arr.length == 0)
            return null;
        let idx = Random.Rangei(0, arr.length);
        let r = arr[idx];
        this.RemoveObjectAtIndex(arr, idx);
        return r;
    }

    static Randoms<T>(arr: T[], len: number): T[] {
        if (arr.length == 0 || arr.length < len)
            return [];
        if (arr.length == len)
            return arr;
        let r = new Array();
        while (r.length != len) {
            let t = ArrayT.Random(arr);
            if (r.indexOf(t) == -1)
                r.push(t);
        }
        return r;
    }

    static PushObjects<T>(l: Array<T>, r: Array<T>) {
        r && r.forEach(e => {
            l.push(e);
        });
    }

    /** 使用另一个数组来填充当前数组 */
    static Set<T>(arr: T[], r: T[]) {
        arr.length = 0;
        r.forEach((o) => {
            arr.push(o);
        }, this);
    }

    /** 复制 */
    static Clone<T>(arr: T[]): T[] {
        if (!arr)
            return [];
        return arr.concat();
    }

    /** 使用指定索引全遍历数组，包括索引外的 */
    static FullEach<T>(arr: T[], idx: number, cbin: (o: T, idx: number) => void, cbout: (o: T, idx: number) => void) {
        let len = Math.min(arr.length, idx);
        for (let i = 0; i < len; ++i) {
            cbin(arr[i], i);
        }
        if (len >= idx) {
            len = arr.length;
            for (let i = idx; i < len; ++i) {
                cbout(arr[i], i);
            }
        }
    }

    /** 删除一个对象 */
    static RemoveObject<T>(arr: T[], obj: T): boolean {
        if (obj == null || arr == null)
            return false;
        let idx = arr.indexOf(obj);
        if (idx == -1)
            return false;
        arr.splice(idx, 1);
        return true;
    }

    /** 删除指定索引的对象 */
    static RemoveObjectAtIndex<T>(arr: T[], idx: number): T {
        let r = arr.splice(idx, 1);
        return r[0];
    }

    /** 使用筛选器来删除对象 */
    static RemoveObjectByFilter<T>(arr: T[], filter: (o: T, idx: number) => boolean, ctx?: any): T {
        if (arr) {
            for (let i = 0; i < arr.length; ++i) {
                let e = arr[i];
                if (filter.call(ctx, e, i)) {
                    arr.splice(i, 1);
                    return e;
                }
            }
        }
        return null;
    }

    static RemoveObjectsByFilter<T>(arr: T[], filter: (o: T, idx: number) => boolean, ctx?: any): T[] {
        let r = new Array();
        if (!arr)
            return r;
        let res = arr.filter((o, idx): boolean => {
            if (filter.call(ctx, o, idx)) {
                r.push(o);
                return false
            }
            return true;
        }, this);
        if (arr.length == res.length)
            return r;
        ArrayT.Set(arr, res);
        return r;
    }

    /** 调整大小 */
    static Resize<T>(arr: T[], size: number, def?: T) {
        if (arr.length < size) {
            let cnt = size - arr.length;
            let base = arr.length;
            for (let i = 0; i < cnt; ++i) {
                arr.push(def);
            }
        } else if (arr.length > size) {
            arr.length = size;
        }
    }

    /** 上浮满足需求的对象 */
    static Rise<T>(arr: T[], q: (e: T) => boolean) {
        let r = new Array();
        let n = new Array();
        arr.forEach((e: T) => {
            if (q(e))
                r.push(e);
            else
                n.push(e);
        });
        ArrayT.Set(arr, r.concat(n));
    }

    /** 下沉满足需求的对象 */
    static Sink<T>(arr: T[], q: (e: T) => boolean) {
        let r = new Array();
        let n = new Array();
        arr.forEach((e: T) => {
            if (q(e))
                r.push(e);
            else
                n.push(e);
        });
        this.Set(arr, n.concat(r));
    }

    /** 乱序 */
    static Disorder<T>(arr: T[]) {
        arr.sort((): number => {
            return Math.random() - Math.random();
        });
    }

    /** 截取尾部的空对象 */
    static Trim<T>(arr: T[], emp: T = null) {
        let t = [];
        for (let i = arr.length; i != 0; --i) {
            let o = arr[i - 1];
            if (t.length == 0 && o == emp)
                continue;
            t.push(o);
        }
        ArrayT.Set(arr, t.reverse());
    }

    static SafeJoin<T>(arr: Array<T>, sep: any, def: any): string {
        if (!arr)
            return def;
        if (arr.indexOf(null) == -1)
            return arr.join(sep);
        let tmp = arr.concat();
        tmp.forEach((e, idx) => {
            if (e == null)
                tmp[idx] = def;
        });
        return tmp.join(sep);
    }

    /** 取得一段 */
    static RangeOf<T>(arr: Array<T>, pos: number, len?: number): Array<T> {
        let n = arr.length;
        if (pos < 0) {
            pos = n + pos;
            if (pos < 0)
                return arr;
        }
        if (pos >= n)
            return [];
        let c = len == null ? n : pos + len;
        return arr.slice(pos, c);
    }

    /** 弹出一段 */
    static PopRangeOf<T>(arr: Array<T>, pos: number, len?: number): Array<T> {
        let n = arr.length;
        if (pos < 0) {
            pos = n + pos;
            if (pos < 0) {
                let r = arr.concat();
                arr.length = 0;
                return r;
            }
        }
        if (pos >= n)
            return [];
        let c = len == null ? n - pos : len;
        return arr.splice(pos, c);
    }

    /** 移除位于另一个 array 中的所有元素 */
    static RemoveObjectsInArray<T>(arr: T[], r: T[]) {
        let res = arr.filter((each: any, idx: number): boolean => {
            return !ArrayT.Contains(r, each);
        }, this);
        ArrayT.Set(arr, res);
    }

    /** 使用位于另一个 array 中对应下标的元素 */
    static RemoveObjectsInIndexArray<T>(arr: T[], r: number[]): T[] {
        let rm = new Array();
        let res = arr.filter((each: T, idx: number): boolean => {
            if (ArrayT.Contains(r, idx) == true) {
                rm.push(each);
                return false;
            }
            return true;
        }, this);
        ArrayT.Set(arr, res);
        return rm;
    }

    /** 使用比较函数来判断是否包含元素 */
    static Contains<L, R>(arr: L[], o: R, eqfun?: (l: L, o: R) => boolean, eqctx?: any): boolean {
        if (!arr || !arr.length)
            return false;
        if (typeof arr[0] == typeof o && ispod(o)) {
            return arr.indexOf(<any>o) != -1;
        }
        return arr.some((each: any): boolean => {
            return ObjectT.IsEqual(each, o, eqfun, eqctx);
        }, this);
    }

    /** 检查两个是否一样 */
    static EqualTo<L, R>(l: L[], r: R[], eqfun?: (l: L, r: R) => boolean, eqctx?: any): boolean {
        if (!l && !r)
            return true;
        if (!l || !r)
            return false;
        if (l.length != r.length)
            return false;
        return r.every((o: any): boolean => {
            return ArrayT.Contains(l, o, eqfun, eqctx);
        }, this);
    }

    /** 严格(包含次序)检查两个是否一样 */
    static StrictEqualTo<L, R>(l: L[], r: R[], eqfun?: (l: L, r: R) => boolean, eqctx?: any): boolean {
        if (!l && !r)
            return true;
        if (!l || !r)
            return false;
        if (l.length != r.length)
            return false;
        return r.every((o: any, idx: number): boolean => {
            return ObjectT.IsEqual(o, r[idx], eqfun, eqctx);
        }, this);
    }

    /** 数组 l 和 r 的共有项目 */
    static ArrayInArray<T>(l: T[], r: T[]): T[] {
        return l.filter((o): boolean => {
            return ArrayT.Contains(r, o);
        }, this);
    }

    /** 合并 */
    static Combine<T>(l: T[], sep: any): any {
        let r = l[0];
        for (let i = 1; i < l.length; i++) {
            r += sep + l[i];
        }
        return r;
    }

    static SeqForeach<T, R>(arr: T[], proc: (e: T, idx: number, next: (ret?: R) => void) => void, complete: (ret?: R) => void) {
        let iter = arr.entries();

        function next(ret?: R) {
            let val = iter.next();
            if (!val.done) {
                proc(val.value[1], val.value[0], next);
            }
            else {
                complete(ret);
            }
        }

        next();
    }

    /** 快速返回下一个或上一个 */
    static Next<T>(arr: Array<T>, obj: T, def?: T): T {
        let idx = arr.indexOf(obj);
        if (idx == -1)
            return def;
        if (idx + 1 == arr.length)
            return def;
        return arr[idx + 1];
    }

    static Previous<T>(arr: Array<T>, obj: T, def?: T): T {
        let idx = arr.indexOf(obj);
        if (idx == -1)
            return def;
        if (idx == 0)
            return def;
        return arr[idx - 1];
    }

    // 组合
    static CombineEach<T>(arr: T[], proc: (oo: T, io: T, idx?: number, oid?: number, iid?: number) => boolean) {
        let cont = true;
        let idx = 0;
        for (let i = 0, len = arr.length; i < len; ++i) {
            let outer = arr[i];
            for (let j = i + 1; j < len; ++j) {
                let inner = arr[j];
                cont = proc(outer, inner, idx++, i, j);
                if (!cont)
                    break;
            }
            if (!cont)
                break;
        }
    };

    static Combination<T>(arr: T[], m = arr.length): T[][] {
        let iter = G.combination(arr, m);
        // G的库需要
        return IterateT.ToArray(iter, e => e.slice());
    }

    static Permutation<T>(arr: T[], m = arr.length): T[][] {
        let iter = G.permutation(arr, m);
        return IterateT.ToArray(iter, e => e.slice());
    }

    static EachCombination<T>(arr: T[], m: number, proc: (e: T[]) => void) {
        this.Combination(arr, m).forEach(proc);
    }

    static EachPermutation<T>(arr: T[], m: number, proc: (e: T[]) => void) {
        this.Permutation(arr, m).forEach(proc);
    }

    // 把数组按照制定索引来排列，proc返回计算后的数组索引
    static MapIndexIn<T>(arr: T[], indics: number[], proc: (e: T, idx?: number) => number = (e, idx) => idx) {
        if (arr.length != indics.length)
            return;
        let tmp = new Array();
        arr.forEach((e, idx) => {
            let t = proc(e, idx);
            let pos = indics.indexOf(t);
            tmp[pos] = e;
        });
        this.Set(arr, tmp);
    }
}

export class SetT {

    static ToArray<T>(arr: Set<T>): T[] {
        let r: T[] = [];
        arr.forEach(e => {
            r.push(e);
        });
        return r;
    }

    static FromArray<T, R>(arr: T[], convert?: (e: T, idx?: number) => R, skipnull = true): Set<R> {
        let r = new Set<R>();
        if (convert) {
            arr.forEach((e, idx) => {
                let t = convert(e, idx);
                if (t == null && skipnull)
                    return;
                r.add(t);
            })
        }
        else {
            arr.forEach((e: any) => {
                if (e == null && skipnull)
                    return;
                r.add(e);
            });
        }
        return r;
    }

    static Clear<T>(arr: Set<T>, proc: (e: T) => void) {
        arr.forEach(proc);
        arr.clear();
    }

    static QueryObject<T>(arr: Set<T>, filter: (e: T, idx: number) => boolean): T {
        return IterateT.QueryObject(arr.values(), filter);
    }
}

export class IterateT {

    static QueryObject<T>(iter: Iterator<T>, filter: (e: T, idx: number) => boolean): T {
        let idx = 0;
        let cur = iter.next();
        while (!cur.done) {
            if (filter(cur.value, idx++))
                return cur.value;
            cur = iter.next();
        }
        return null;
    }

    static ToArray<T>(iter: Iterator<T>, proc?: (v: T) => T): Array<T> {
        let r = new Array();
        let res = iter.next();
        while (!res.done) {
            r.push(proc ? proc(res.value) : res.value);
            res = iter.next();
        }
        return r;
    }
}

export class ObjectT {

    // 任意对象的比较
    static Compare(l: any, r: any): COMPARERESULT {
        if (l > r)
            return COMPARERESULT.GREATER;
        if (l < r)
            return COMPARERESULT.LESS;
        return COMPARERESULT.EQUAL;
    }

    static Minus(l: any, r: any): number {
        return l - r;
    }

    static Max<T>(l: T, r: T): T {
        return ObjectT.Compare(l, r) == COMPARERESULT.GREATER ? l : r;
    }

    static Min<T>(l: T, r: T): T {
        return ObjectT.Compare(l, r) == COMPARERESULT.LESS ? l : r;
    }

    static QueryObject(tgt: any, filter: (e: any, k: string) => boolean): any {
        for (let k in tgt) {
            let v = tgt[k];
            if (filter(v, k))
                return v;
        }
        return null;
    }

    static Foreach(tgt: any, proc: (e: any, k: string) => void) {
        for (let k in tgt) {
            proc(tgt[k], k);
        }
    }

    static Clear(tgt: any, proc: (e: any, k: string) => void) {
        for (let k in tgt) {
            proc(tgt[k], k);
            delete tgt[k];
        }
    }

    // 第一层的赋值，如果左边存在，则不覆盖左边的
    static LightMerge(l: any, r: any) {
        for (let k in r) {
            if (k in l)
                continue;
            l[k] = r[k];
        }
    }

    // from r copy to l
    static LightCopy(l: any, r: any) {
        for (let k in r) {
            l[k] = r[k];
        }
    }

    // 只copy第一层
    static LightClone(tgt: any): any {
        let r: IndexedObject = {};
        for (let k in tgt) {
            r[k] = tgt[k];
        }
        return r;
    }

    static DeepClone(tgt: any): any {
        let r: IndexedObject = {};
        for (let k in tgt) {
            let v = tgt[k];
            if (v == null) {
                r[k] = v;
            }
            else if (v instanceof Array) {
                let t = new Array();
                v.forEach(e => {
                    t.push(ObjectT.DeepClone(e));
                });
                r[k] = t;
            }
            else {
                let typ = typeof(v);
                if (typ == "string" || typ == "number" || typ == "boolean") {
                    r[k] = v;
                }
                else {
                    r[k] = ObjectT.DeepClone(v);
                }
            }
        }
        return r;
    }

    /** 比较两个实例是否相等
     @brief 优先使用比较函数的结果
     */
    static IsEqual<L, R>(l: L, r: R, eqfun?: (l: L, r: R) => boolean, eqctx?: any): boolean {
        if (l == null || r == null)
            return false;
        if (eqfun)
            return eqfun.call(eqctx, l, r);
        if (l && (<any>l).isEqual)
            return (<any>l).isEqual(r);
        if (r && (<any>r).isEqual)
            return (<any>r).isEqual(l);
        return <any>l == <any>r;
    }

    /** 根据查询路径获取值 */
    static GetValueByKeyPath(o: any, kp: string, def?: any): any {
        if (o == null)
            return def;
        let ks = kp.split('.');
        for (let i = 0; i < ks.length; ++i) {
            o = o[ks[i]];
            if (o == null)
                return def;
        }
        return o;
    }

    static GetValueByKeyPaths(o: any, def: any, ...ks: any[]): any {
        if (o == null)
            return def;
        for (let i = 0; i < ks.length; ++i) {
            o = o[ks[i]];
            if (o == null)
                return def;
        }
        return o;
    }

    /** 根据查询路径设置值 */
    static SetValueByKeyPath(o: any, kp: string, v: any): boolean {
        if (o == null) {
            console.warn("不能对null进行keypath的设置操作");
            return false;
        }
        let ks = kp.split('.');
        let l = ks.length - 1;
        for (let i = 0; i < l; ++i) {
            let k = ks[i];
            let t = o[k];
            if (t == null) {
                t = {};
                o[k] = t;
            }
            o = t;
        }
        o[ks[l]] = v;
        return true;
    }

    static SetValueByKeyPaths(o: any, v: any, ...ks: any[]): boolean {
        if (o == null) {
            console.warn("不能对null进行keypath的设置操作");
            return false;
        }
        let l = ks.length - 1;
        for (let i = 0; i < l; ++i) {
            let k = ks[i];
            let t = o[k];
            if (t == null) {
                t = {};
                o[k] = t;
            }
            o = t;
        }
        o[ks[l]] = v;
        return true;
    }

    static SeqForin<T, R>(obj: { [key: string]: T }, proc: (e: T, key: string, next: (ret?: R) => void) => void, complete: (ret?: R) => void) {
        let keys = Object.keys(obj);
        let iter = keys.entries();

        function next(ret?: R) {
            let val = iter.next();
            if (!val.done) {
                proc(obj[val.value[1]], keys[val.value[0]], next);
            }
            else {
                complete(ret);
            }
        }

        next();
    }

    static QueryObjects<V>(m: KvObject<V>, proc: (v: V, k: string) => boolean): V[] {
        let r = new Array();
        for (let k in m) {
            let v = m[k];
            if (proc(v, k))
                r.push(v);
        }
        return r;
    }

    static Convert<V, R>(m: KvObject<V>, convert: (v: V, k: string) => R, skipnull = false): R[] {
        let r = new Array<R>();
        for (let k in m) {
            let v = convert(m[k], k);
            if (skipnull && !v)
                continue;
            r.push(v);
        }
        return r;
    }

    static HasKey(m: any, key: string): boolean {
        if (!m)
            return false;
        return key in m;
    }

    static Get(m: any, key: string): any {
        return m[key];
    }

    static Set(m: any, key: string, value: any) {
        m[key] = value;
    }

    // @sort 是否打开字典序
    static ToMap(obj: IndexedObject, sort = true): Map<string, any> {
        let r = new Map<string, any>();
        let keys = Object.keys(obj);
        if (sort)
            keys.sort();
        keys.forEach(e => {
            r.set(e, obj[e]);
        });
        return r;
    }

    static Length(obj: any): number {
        return Object.keys(obj).length;
    }
}

export class Range<T> {

    constructor(l: T, r: T) {
        this.left = l;
        this.right = r;
    }

    contains(o: T): boolean {
        return this.left <= o && o <= this.right;
    }

    left: T;
    right: T;
}

export class Random {

    static Rangef(from: number, to: number): number {
        return Math.random() * (to - from) + from;
    }

    // @param close true:[], false:[)
    static Rangei(from: number, to: number, close = false): number {
        if (close)
            return Math.round(Random.Rangef(from, to));
        return Math.floor(Random.Rangef(from, to));
    }
}

export class Fs {

    // 同步复制文件
    static copySync(from: string, to: string): boolean {
        let suc = true;
        try {
            fs.writeFileSync(to, fs.readFileSync(from));
        }
        catch (err) {
            suc = false;
            console.error(err);
        }
        return suc;
    }

    static copyAndDelete(from: string, to: string, cb: (err: Error) => void) {
        let readStream = fs.createReadStream(from);
        let writeStream = fs.createWriteStream(to);
        readStream.on('error', cb);
        writeStream.on('error', cb);
        readStream.on('close',
            function () {
                fs.unlink(from, cb);
            }
        );
        readStream.pipe(writeStream);
    }

    // 重命名文件
    static move(from: string, to: string, cb: (err: Error) => void) {
        fs.rename(from, to,
            function (err) {
                if (err) {
                    if (err.code === 'EXDEV') {
                        Fs.copyAndDelete(from, to, cb);
                    }
                    else {
                        cb(err);
                    }
                    return;
                }
                cb(err);
            }
        );
    }
}

export enum COMPARERESULT {
    EQUAL = 0,
    GREATER = 1,
    LESS = -1,
}

export class NumberT {

    /** 任一数字的科学计数读法
     @return 数字部分和e的部分
     */
    static SciNot(v: number): [number, number] {
        let n = NumberT.log(v, 10);
        let l = v / Math.pow(10, n);
        return [l, n];
    }

    /** 方根 */
    static radical(v: number, x: number, n: number) {
        return Math.exp(1 / n * Math.log(x));
    }

    /** 对数 */
    static log(v: number, n: number): number {
        let r = Math.log(v) / Math.log(n) + 0.0000001;
        return r >> 0;
    }

    /** 修正为无符号 */
    static Unsigned(v: number): number {
        if (v < 0)
            return 0xFFFFFFFF + v + 1;
        return v;
    }

    /** 映射到以m为底的数 */
    static MapToBase(v: number, base: number): number {
        if (v % base == 0)
            return base;
        return v % base;
    }

    /** 运算，避免为null时候变成nan */
    static Add(v: number, r: number): number {
        if (v == null)
            v = 0;
        if (r == null)
            r = 0;
        return v + r;
    }

    static Sub(v: number, r: number): number {
        if (v == null)
            v = 0;
        if (r == null)
            r = 0;
        return v - r;
    }

    static Multiply(v: number, r: number): number {
        if (v == null)
            v = 0;
        if (r == null)
            r = 0;
        return v * r;
    }

    static Div(v: number, r: number, of: number = MAX_INT): number {
        if (v == null)
            v = 0;
        if (r == null || r == 0)
            return of;
        return v / r;
    }

    static HANMAPS = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];

    /** 中文化数字 */
    static Hanlize(v: number): string {
        let neg;
        if (v < 0) {
            neg = true;
            v = -v;
        }
        let r = neg ? '负' : '';
        if (v <= 10)
            r += this.HANMAPS[v];
        return r;
    }

    static ToRange<T>(v: T, l: T, r: T, def: T): T {
        if (v >= l && v <= r)
            return v;
        return def;
    }

    // 设置小数精度
    // length 小数点后的位数
    static TrimFloat(v: number, length: number): number {
        let p = Math.pow(10, length);
        return Math.round(v * p) / p;
    }

    // 整数拆分
    static SplitInteger(v: number, base: number): [number, number] {
        let n = (v / base) >> 0;
        return [n, v - n * base];
    }
}


// 格式化字串
export function format(fmt: string, ...args: any[]): string {
    let r: string;
    try {
        r = vsprintf(fmt, args);
    } catch (err) {
        logger.warn("格式和输入的不匹配 {{=it.fmt}}", {fmt: fmt});
    }
    return r;
}

export function formatv(fmt: string, args: any[]): string {
    let r: string;
    try {
        r = vsprintf(fmt, args);
    } catch (err) {
        logger.warn("格式和输入的不匹配 {{=it.fmt}}", {fmt: fmt});
    }
    return r;
}

// 字串模板
export function template(fmt: string, params: IndexedObject): string {
    if (fmt == null)
        return "";
    return dotpl.template(fmt)(params);
}

export class StringT {

    // 去除掉float后面的0
    static TrimFloat(str: string): string {
        let lr = str.split('.');
        if (lr.length != 2) {
            console.warn("传入的 stirng 格式错误");
            return str;
        }

        let ro = lr[1], m = false, rs = '';
        for (let i = ro.length; i > 0; --i) {
            let c = ro[i - 1];
            if (!m && c != '0')
                m = true;
            if (m)
                rs = c + rs;
        }
        if (rs.length == 0)
            return lr[0];
        return lr[0] + '.' + rs;
    }

    static Hash(str: string): number {
        let hash = 0;
        if (str.length == 0)
            return hash;
        for (let i = 0; i < str.length; ++i) {
            hash = (((hash << 5) - hash) + str.charCodeAt(i)) & 0xffffffff;
        }
        return hash;
    }

    static Contains(str: string, ...tgt: string[]): boolean {
        for (let i = 0, l = tgt.length; i < l; ++i) {
            if (str.indexOf(tgt[i]) != -1)
                return true;
        }
        return false;
    }

    static Count(str: string, substr: string): number {
        let pos = str.indexOf(substr);
        if (pos == -1)
            return 0;
        let r = 1;
        r += this.Count(str.substr(pos + substr.length), substr);
        return r;
    }

    /** 计算ascii的长度 */
    static AsciiLength(str: string): number {
        let r = 0;
        for (let i = 0; i < str.length; ++i) {
            let c = str.charCodeAt(i);
            r += c > 128 ? 2 : 1;
        }
        return r;
    }

    /** 拆分，可以选择是否去空 */
    static Split(str: string, sep: string, skipempty: boolean = true): Array<string> {
        let r = str.split(sep);
        let r0 = new Array();
        r.forEach((e: string) => {
            if (e.length)
                r0.push(e);
        });
        return r0;
    }

    /** 拉开，如果不足制定长度，根据mode填充
     @param mode 0:中间填充，1:左边填充，2:右边填充
     @param wide 是否需要做宽字符补全，如果str为中文并且sep为单字节才需要打开
     */
    static Stretch(str: string, len: number, mode: number = 0, sep: string = ' ', wide = true): string {
        if (str.length >= len)
            return str;
        if (str.length == 0) {
            let r = '';
            while (len--)
                r += sep;
            return r;
        }
        let n = len - str.length;
        let r = '';
        switch (mode) {
            case 0: {
                let c = (len - str.length) / (str.length - 1);
                if (wide)
                    c *= 2;
                if (c >= 1) {
                    // 每个字符后面加sep
                    for (let i = 0; i < str.length - 1; ++i) {
                        r += str[i];
                        for (let j = 0; j < c; ++j)
                            r += sep;
                    }
                    r += str[str.length - 1];
                } else {
                    r = str;
                }
                // 如果不匹配，则补全
                if (r.length < len) {
                    n = len - str.length;
                    if (wide)
                        n *= 2;
                    while (n--)
                        r += sep;
                }
            }
                break;
            case 1: {
                while (n--)
                    r = sep + r;
                r += str;
            }
                break;
            case 2: {
                r = str;
                while (n--)
                    r += sep;
            }
                break;
        }
        return r;
    }

    static Code(s: string): number[] {
        let r = [];
        let l = s.length;
        for (let i = 0; i < l; ++i)
            r.push(s.charCodeAt(i));
        return r;
    }

    static FromCode(c: number[]): string {
        return String.fromCharCode.apply(null, c);
    }

    // 小写化
    static Lowercase(str: string, def = ""): string {
        return str ? str.toLowerCase() : def;
    }

    static Uppercase(str: string, def = ""): string {
        return str ? str.toUpperCase() : def;
    }

    // 标准的substr只支持正向，这里实现的支持两个方向比如，substr(1, -2)
    static SubStr(str: string, pos: number, len?: number): string {
        if (len == null || len >= 0)
            return str.substr(pos, len);
        if (pos < 0)
            pos = str.length + pos;
        pos += len;
        let of = 0;
        if (pos < 0) {
            of = pos;
            pos = 0;
        }
        return str.substr(pos, -len + of);
    }

    static Repeat(str: string, count: number = 1): string {
        let r = "";
        while (count--) {
            r += str;
        }
        return r;
    }
}

export class MapT {

    // 对某个key
    static Inc<K, V>(m: Map<K, V>, key: K, v: V): V {
        if (m.has(key)) {
            let cur = <any>m.get(key);
            cur += v;
            m.set(key, cur);
            return cur;
        }
        m.set(key, v);
        return v;
    }

    static Sum<K, V, R>(m: Map<K, V>, proc: (v: V, k: K) => R): R {
        let r: any = null;
        let idx = 0;
        m.forEach((v, k) => {
            if (idx++ == 0)
                r = proc(v, k);
            else
                r += proc(v, k);
        });
        return r;
    }

    static Max<K, V>(m: Map<K, V>, proc: (v: V, k: K) => V): V {
        let cur: V;
        let obj: V;
        let idx = 0;
        m.forEach((v, k) => {
            if (idx++ == 0) {
                cur = proc(v, k);
                obj = v;
                return;
            }
            let t = proc(v, k);
            if (ObjectT.Compare(cur, t) == COMPARERESULT.LESS) {
                cur = t;
                obj = v;
            }
        });
        return obj;
    }

    static Min<K, V>(m: Map<K, V>, proc: (v: V, k: K) => V): V {
        let cur: V;
        let obj: V;
        let idx = 0;
        m.forEach((v, k) => {
            if (idx++ == 0) {
                cur = proc(v, k);
                obj = v;
                return;
            }
            let t = proc(v, k);
            if (ObjectT.Compare(t, cur) == COMPARERESULT.LESS) {
                cur = t;
                obj = v;
            }
        });
        return obj;
    }

    static Foreach<K, V>(m: Map<K, V>, proc: (v: V, k: K) => boolean): boolean {
        let iter = m.entries();
        let each = iter.next();
        while (!each.done) {
            if (!proc(each.value[1], each.value[0]))
                return false;
            each = iter.next();
        }
        return true;
    }

    static SeqForeach<K, V, R>(m: Map<K, V>, proc: (v: V, k: K, next: (ret?: R) => void) => void, complete: (ret?: R) => void) {
        let iter = m.entries();

        function next(ret?: R) {
            let val = iter.next();
            if (!val.done) {
                proc(val.value[1], val.value[0], next);
            }
            else {
                complete(ret);
            }
        }

        next();
    }

    static QueryObjects<K, V>(m: Map<K, V>, proc: (v: V, k: K) => boolean): Array<V> {
        let r = new Array();
        m.forEach((v, k) => {
            if (proc(v, k))
                r.push(v);
        });
        return r;
    }

    static Keys<K, V>(m: Map<K, V>): K[] {
        let r = new Array<K>();
        m.forEach((v, k) => {
            r.push(k);
        });
        return r;
    }

    static Values<K, V, R>(m: Map<K, V>, proc?: (v: V, k: K) => R, skipnull = false): R[] {
        let r = new Array<R>();
        if (proc) {
            m.forEach((v, k) => {
                let t = proc(v, k);
                if (skipnull && !t)
                    return;
                r.push(t);
            });
        }
        else {
            m.forEach((v) => {
                r.push(<any>v);
            });
        }
        return r;
    }

    static ValueAtIndex<K, V>(m: Map<K, V>, idx: number, def?: V): V {
        let iter = m.values();
        let cur = iter.next();
        while (!cur.done && idx--) {
            cur = iter.next();
        }
        return (idx > 0 || cur.done) ? def : cur.value;
    }

    static Sort<K, V>(m: Map<K, V>, proc?: (l: V, r: V) => number): tuple<K, V>[] {
        let tps = MapT.ToTuples(m);
        if (proc) {
            tps.sort((l, r) => {
                return proc(l[1], r[1]);
            });
        }
        else {
            tps.sort((l, r) => {
                return ObjectT.Minus(l[1], r[1]);
            });
        }
        return tps;
    }

    static ToTuples<K, V>(m: Map<K, V>): tuple<K, V>[] {
        let r = new Array();
        m.forEach((v, k) => {
            r.push(make_tuple(k, v));
        });
        return r;
    }

    static FromArray<K, V, R>(arr: R[], proc: (map: Map<K, V>, obj: R, idx?: number) => void, inm?: Map<K, V>): Map<K, V> {
        if (!inm)
            inm = new Map<K, V>();
        arr.forEach((e, idx) => {
            proc(inm, e, idx);
        });
        return inm;
    }
}

export const MAX_LONG = Number.MAX_SAFE_INTEGER;
export const MIN_LONG = Number.MIN_SAFE_INTEGER;
export const MAX_INT = 0x7fffffff;
export const MIN_INT = -MAX_INT;

/** 带保护的取得一个对象的长度 */
export function length(o: any, def = 0): number {
    if (o == null)
        return def;
    return o.length;
}

/** 带保护的取一堆中第一个不是空的值 */
export function nonnull1st<T>(def: T, ...p: T[]) {
    for (let i = 0; i < p.length; ++i) {
        let v = p[i];
        if (v != null)
            return v;
    }
    return def;
}

/** 带保护的根据下标取得列表中的对象 */
export function at<T>(o: any, idx: KeyType, def: T = null): T {
    if (o == null)
        return <T>def;
    if (o instanceof Array) {
        if (o.length <= idx)
            return def;
        return o[idx];
    }
    if (o instanceof Map) {
        return o.get(idx);
    }
    let r = o[idx];
    return r === undefined ? def : r;
}

/** 带保护的判断对象是不是 0 */
export function isZero(o: any): boolean {
    if (o == null || o == 0)
        return true;
    if (o.length)
        return o.length == 0;
    return false;
}

function SafeNumber(o: any, def = 0): number {
    return isNaN(o) ? def : o;
}

/** 转换到 float */
export function toFloat(o: any, def = 0): number {
    if (o == null)
        return def;
    let tp = typeof(o);
    if (tp == 'number')
        return SafeNumber(o, def);
    if (tp == 'string') {
        let v = Number(<string>o);
        return SafeNumber(v, def);
    }
    if ((<INumber>o).toNumber)
        return (<INumber>o).toNumber();
    return def;
}

/** 转换到 int */
export function toInt(o: any, def = 0): number {
    if (o == null)
        return def;
    let tp = typeof(o);
    if (tp == 'number' || tp == 'string') {
        let v = Number(<any>o);
        // 不使用 >>0 整数化的原因是bigint会被限制到32位
        v = SafeNumber(v, def);
        if (v < MAX_INT && v > -MAX_INT)
            return v >> 0;
        return v; // 超大数的时候int或者float已经并不重要
    }
    if ((<INumber>o).toNumber) {
        let v = (<INumber>o).toNumber();
        if (v < MAX_INT && v > -MAX_INT)
            return v >> 0;
        return v;
    }
    return def;
}

/** 转换到数字
 @brief 如果对象不能直接转换，会尝试调用对象的 toNumber 进行转换
 */
export function toNumber<T extends INumber>(o: PodType | T, def = 0): number {
    if (o == null)
        return def;
    let tp = typeof(o);
    if (tp == 'number')
        return SafeNumber(o, def);
    if (tp == 'string') {
        if ((<string>o).indexOf('.') == -1) {
            let v = Number(<string>o);
            return SafeNumber(v, def);
        }
        let v = Number(<string>o);
        return SafeNumber(v, def);
    }
    if ((<INumber>o).toNumber)
        return (<INumber>o).toNumber();
    return def;
}

export function toBoolean(v: any): boolean {
    if (v == "true")
        return true;
    if (v == "false")
        return false;
    return !!v;
}

/** 转换到字符串 */
export function asString(o: any, def = ''): string {
    if (o == null)
        return def;
    let tp = typeof(o);
    if (tp == 'string')
        return <string>o;
    if (tp == 'number')
        return SafeNumber(o).toString();
    if (o.toString) {
        let t = o.toString();
        if (t != "[object Object]")
            return t;
    }
    // 转换成json
    let r: string;
    try {
        r = JSON.stringify(o);
    } catch (err) {
        r = def;
    }
    return r;
}

export function toJson(o: IndexedObject, def: string = null) {
    let r: string;
    try {
        r = JSON.stringify(o);
    }
    catch (err) {
        r = def;
    }
    return r;
}

export function toJsonObject(o: jsonobj, def: any = null): IndexedObject {
    let t = typeof(o);
    if (t == 'string') {
        if (o == "undefined" || o == "null")
            return def;
        let r: any;
        try {
            r = JSON.parse(o as string);
        }
        catch (err) {
            logger.warn(o + " " + err);
            r = def;
        }
        return r;
    }
    else if (t == 'object')
        return <any>o;
    return def;
}

export function toJsonArray(o: jsonobj, def: any[] = null): IndexedObject[] {
    let t = typeof(o);
    if (t == 'string') {
        if (o == "undefined" || o == "null")
            return def;
        let r: any;
        try {
            r = JSON.parse(o as string);
        }
        catch (err) {
            logger.warn(o + " " + err);
            r = def;
        }
        return r;
    }
    else if (t == 'object')
        return <any>o;
    return def;
}

export function SafeEval(str: string): any {
    let r: any;
    try {
        r = eval(str);
    } catch (ex) {
        logger.warn(ex);
    }
    return r;
}

function INT(v: any): number {
    return Math.floor(v);
}

/** 运行公式 */
export function EvalFormula(f: string, vars: IndexedObject, upcase: boolean = true): any {
    try {
        let vs = [];
        for (let k in vars) {
            vs.push(!upcase ? k : k.toUpperCase() + "=" + vars[k]);
        }
        let cmd = "var " + vs.join(",") + ";" + f;
        return eval(cmd);
    }
    catch (err) {
        logger.log(err);
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

export class IndexedMap<K, V> {

    set(k: K, v: V) {
        if (this._map.has(k)) {
            this._map.set(k, v);
            let idx = this._keys.indexOf(k);
            this._keys[idx] = k;
            this._vals[idx] = v;
        }
        else {
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

    sync(): _SyncMap<K, V> {
        if (!this._async) {
            this._async = SyncMap(this._map);
        }
        return this._async;
    }

    private _async: _SyncMap<K, V>;
}

export class Mask {

    static Set(value: number, mask: number): number {
        if (this.Has(value, mask))
            return value;
        return value | mask;
    }

    static Unset(value: number, mask: number): number {
        if (!this.Has(value, mask))
            return value;
        return value ^ mask;
    }

    static Has(value: number, mask: number): boolean {
        return (value & mask) == mask;
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