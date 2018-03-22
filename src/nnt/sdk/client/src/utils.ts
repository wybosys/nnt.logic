import {IndexedObject, jsonobj} from "./model";

export type PodType = number | string | boolean;

export interface INumber {
    toNumber(): number;
}

function SafeNumber(o: any, def = 0): number {
    return isNaN(o) ? def : o;
}

/** 转换到 float */
export function toFloat<T extends INumber>(o: PodType | T, def = 0): number {
    if (o == null)
        return def;
    let tp = typeof(o);
    if (tp == 'number')
        return SafeNumber(o, def);
    if (tp == 'string') {
        let v = parseFloat(<string>o);
        return SafeNumber(v, def);
    }
    if ((<INumber>o).toNumber)
        return (<INumber>o).toNumber();
    return def;
}

export const MAX_INT = 0x7fffffff;
export const MIN_INT = -MAX_INT;

/** 转换到 int */
export function toInt<T extends INumber>(o: PodType | T, def = 0): number {
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
            let v = parseInt(<string>o);
            return SafeNumber(v, def);
        }
        let v = parseFloat(<string>o);
        return SafeNumber(v, def);
    }
    if ((<INumber>o).toNumber)
        return (<INumber>o).toNumber();
    return def;
}

export class Random {

    static Rangef(from: number, to: number): number {
        return Math.random() * (to - from) + from;
    }

    static Rangei(from: number, to: number, close = false): number {
        if (close)
            return Math.round(Random.Rangef(from, to));
        return Math.floor(Random.Rangef(from, to));
    }
}

export class ArrayT {

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

    static RemoveObject<T>(arr: T[], obj: T): boolean {
        if (obj == null || arr == null)
            return false;
        let idx = arr.indexOf(obj);
        if (idx == -1)
            return false;
        arr.splice(idx, 1);
        return true;
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

    static AsyncForeach<T>(arr: T[], each: (next: () => void, obj: T, idx: number) => void, complete: () => void) {
        let tmp = arr.concat();
        let i = 0, l = tmp.length;

        function proc() {
            if (i++ == l) {
                complete();
                return;
            }
            each(proc, tmp[i], i);
        }

        proc();
    }

    static AsyncConvert<T, R>(arr: T[], cvt: (next: (obj: R) => void, obj: T, idx: number) => void, complete: (res: R[]) => void) {
        let tmp = arr.concat();
        let i = 0, l = tmp.length;
        let r = new Array<R>();

        if (i == l) {
            complete(r);
            return;
        }

        function proc(obj: R) {
            r.push(obj);

            if (i++ == l) {
                complete(r);
                return;
            }

            cvt(proc, tmp[i], i);
        }

        // 处理第一个
        cvt(proc, tmp[i], i++);
    }
}

export class ObjectT {
    static SeqForin<T, R>(obj: { [key: string]: T }, proc: (e: T, key: string, next: (ret?: R) => void) => void, complete: (ret?: R) => void) {
        let keys = Object.keys(obj);
        let i = 0, l = keys.length;

        function next(ret?: R) {
            if (i < l) {
                let c = i++;
                proc(obj[keys[c]], keys[c], next);
            }
            else {
                complete(ret);
            }
        }

        next();
    }
}

export class StringT {

    // 选择响度速度快的，主要是在sdk中，对碰撞的容忍度较高
    static Hash(str: string): number {
        let r = 0;
        if (str.length === 0)
            return r;
        for (let i = 0; i < str.length; i++) {
            let chr = str.charCodeAt(i);
            r = ((r << 5) - r) + chr;
            r |= 0;
        }
        return r;
    }

    // 小写化
    static Lowercase(str: string, def = ""): string {
        return str ? str.toLowerCase() : def;
    }

    static Uppercase(str: string, def = ""): string {
        return str ? str.toUpperCase() : def;
    }

    static UpcaseFirst(str: string): string {
        if (!str || !str.length)
            return "";
        return str[0].toUpperCase() + str.substr(1);
    }
}

export function timestamp(): number {
    return new Date().getTime() / 1000 >> 0;
}

let NAVIGATOR = typeof navigator == "undefined" ? null : navigator;
if (typeof navigator == "undefined") {
    let t: any = {
        appVersion: ""
    };
    NAVIGATOR = t;
}

export class Device {
    static IOS = /iPad|iPhone|iPod/.test(NAVIGATOR.appVersion)
}

export function toJsonObject(o: jsonobj, def: any = null): IndexedObject {
    let t = typeof(o);
    if (t == 'string') {
        let r: any;
        try {
            r = JSON.parse(o as string);
        } catch (err) {
            //console.warn(o + " " + err);
            r = def;
        }
        return r;
    }
    else if (t == 'object')
        return <any>o;
    return def;
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

// 计算重试的时间
export function RetryTime(retrys: number): number {
    return Math.log(retrys) + 1;
}

export function InstanceXmlHttpRequest(): XMLHttpRequest {
    return new XMLHttpRequest();
}

export function LoadJs(id: string, url: string, suc?: () => void) {
    let ele = document.createElement("script");
    ele.type = "text/javascript";
    ele.id = id;
    ele.src = url;
    ele.onload = suc;
    document.head.appendChild(ele);
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

type QueueCallback = (next: () => void) => void;

export class Queue {

    add(func: QueueCallback): Queue {
        this._store.push(func);
        return this;
    }

    run() {
        let iter = this._store.entries();
        this.doIter(iter);
    }

    protected doIter(iter: IterableIterator<[number, QueueCallback]>) {
        let val = iter.next();
        if (val.done)
            return;
        val.value[1](() => {
            this.doIter(iter);
        });
    }

    private _store = new Array<QueueCallback>();
}

export function Retry(cond: () => boolean, proc: () => void, interval = 1, delta = 2) {
    if (!cond()) {
        setTimeout(() => {
            Retry(cond, proc, interval + delta, delta);
        }, interval * 1000);
    }
    else {
        proc();
    }
}
