import dotpl = require("dot");
import {logger} from "./logger";
import {vsprintf} from "sprintf-js";

export type Class<T> = {
    new(...args: any[]): T, [key: string]: any, prototype: any
};
export type AnyClass = Class<any>;
export type KvObject<V> = {
    [key: string]: V, [key: number]: V;
};
export type IndexedObject = KvObject<any>;
export type PodType = number | string | boolean;
export type clazz_type = AnyClass | string;

export function ispod(v: any): boolean {
    let typ = typeof v;
    return typ == "number" || v == "string" || v == "boolean";
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
    } else {
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
    } else {
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
}

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

export function use<T>(v: T, proc: (v: T) => void): T {
    proc(v);
    return v;
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
    let tp = typeof (o);
    if (tp == 'string') {
        if (tp.length == 0)
            return true;
        return o.match(/^\s*$/) != null;
    } else if (tp == "boolean") {
        return false;
    } else if (tp == "number") {
        return false;
    }
    if (o instanceof Array) {
        return (<any>o).length == 0;
    }
    if (o instanceof Map) {
        return o.size == 0;
    }
    if (o instanceof Set) {
        return o.size == 0;
    }
    return Object.keys(o).length == 0;
}


export class Range<T = number> {

    constructor(l?: T, r?: T) {
        this.left = l;
        this.right = r;
    }

    contains(o: T): boolean {
        return this.left <= o && o <= this.right;
    }

    get length(): number {
        return <any>this.right - <any>this.left;
    }

    set length(len: number) {
        this.right = <any>this.left + len;
    }

    left: T;
    right: T;
}

export enum COMPARERESULT {
    EQUAL = 0,
    GREATER = 1,
    LESS = -1,
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

// 字符串kv拼装模板
export function template(fmt: string, params: IndexedObject): string {
    if (fmt == null)
        return "";
    return dotpl.template(fmt)(params);
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
export function at<T>(o: any, idx: any, def: T = null): T {
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
export function toDouble(o: any, def = 0): number {
    if (o == null)
        return def;
    let tp = typeof (o);
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
    let tp = typeof (o);
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
export function toNumber(o: any, def = 0): number {
    if (o == null)
        return def;
    let tp = typeof (o);
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
    let tp = typeof (o);
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

function INT(v: any): number {
    return Math.floor(v);
}
