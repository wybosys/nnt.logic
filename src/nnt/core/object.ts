import {Signals} from "./signals";
import {logger} from "./logger";
import {Classname} from "./v8";
import {IsDebug} from "../manager/config";
import {CancelDelay, Delay, DelayHandler} from "./time";
import {IndexedObject, toJson, toJsonObject} from "./kernel";
import fs = require("fs");
import stmbuf = require("stream-buffers");

export class OidObject {

    private static __cnter = 0;
    private _oid: number = ++OidObject.__cnter;

    get oid(): number {
        return this._oid;
    }
}

/** 增加引用计数 */
export function grab<T>(o: T): T {
    if (o == null)
        return undefined;
    (<any>o).grab();
    return o;
}

/** 减计数对象 */
export function drop<T>(o: T): T {
    if (o == null)
        return undefined;
    return (<any>o).drop();
}

/** 直接析构一个对象 */
export function dispose<T>(o: T) {
    if (o == null)
        return;
    (<any>o).dispose();
}

export interface ISerializableObject {

    // 序列化
    serialize(): string;

    // 反序列化
    unserialize(str: string): boolean;
}

export interface ISObject {
    signals: Signals;
}

/** 基类的接口 */
export interface IObject {
    dispose(): void;
}

/** 引用计数的接口 */
export interface IReference {
    drop(): void;

    grab(): void;
}

export interface IRefObject
    extends IObject, IReference {
}

export class SObject implements IRefObject, ISObject {

    /** 构造函数 */
    constructor() {
    }

    // 给客户端自由防止标记
    tag: any;

    // 已经析构掉，用来 debug 模式下防止多次析构
    __disposed = false;

    /** 析构函数 */
    dispose() {
        if (IsDebug() && this.__disposed) {
            logger.warn("对象 " + Classname(this) + " 已经析构");
        }
        this.__disposed = true;

        if (this._signals) {
            this._signals.dispose();
            this._signals = undefined;
        }
    }

    /** 实现注册信号
     @note 业务通过重载此函数并通过调用 this._signals.register 来注册信号
     */
    protected _initSignals() {
    }

    /** 信号 */
    protected _signals: Signals;
    get signals(): Signals {
        if (this._signals)
            return this._signals;
        this._instanceSignals();
        return this._signals;
    }

    protected _instanceSignals() {
        this._signals = new Signals(this);
        this._initSignals();
    }

    /** 维护一个内部的引用计数器，防止对象的提前析构 */
    protected _refcnt = 1;

    /** 释放一次引用，如果到0则析构对象 */
    drop() {
        if (IsDebug() && this.__disposed) {
            logger.warn("对象 " + Classname(this) + " 已经析构");
        }

        if (--this._refcnt == 0)
            this.dispose();
    }

    /** 增加一次引用 */
    grab() {
        ++this._refcnt;
    }

    /** 调用自己 */
    callself<implT>(cb: (s: implT) => void, ctx?: any): implT {
        cb.call(ctx ? ctx : this, this);
        return <any>this;
    }

    /** 获得自己，为了支持 InstanceType */
    get obj(): this {
        return this;
    }

    /** 测试自己是否为空 */
    isnull(): boolean {
        if (this.__disposed)
            return true;
        return false;
    }

    /** 比较函数 */
    isEqual(r: this): boolean {
        return this == r;
    }
}

export class Delayer extends OidObject {

    constructor(time: number, proc: Function) {
        super();
        this._proc = () => {
            proc();
            this._hdl = null;
        };
        this._time = time;
    }

    run() {
        this._hdl = Delay(this._time, this._proc);
    }

    cancel() {
        if (this._hdl) {
            CancelDelay(this._hdl);
            this._hdl = null;
        }
    }

    private _proc: Function;
    private _time: number;
    private _hdl: DelayHandler;
}

export class ObjectExt extends SObject {

    tr(key: string): string {
        return key;
    }

    tag: any;

    /** 唯一id */
    static HashCode = 0;
    hashCode: number = ++ObjectExt.HashCode;
}

export enum VariantType {
    UNKNOWN = 0,
    BUFFER = 1,
    STRING = 2,
    OBJECT = 3,
    BOOLEAN = 4,
    NUMBER = 5,
}

export class Variant implements ISerializableObject {

    constructor(o: any) {
        this._raw = o;
        if (!o)
            return;
        if (o instanceof Buffer) {
            this._type = VariantType.BUFFER;
            this._buf = o;
        }
        else {
            const typ = typeof o;
            if (typ == "string") {
                this._type = VariantType.STRING;
                this._str = o;
            }
            else if (typ == "boolean") {
                this._type = VariantType.BOOLEAN;
                this._bol = o;
            }
            else if (typ == "number") {
                this._type = VariantType.NUMBER;
                this._num = o;
            }
            else {
                this._type = VariantType.OBJECT;
                this._jsobj = o;
            }
        }
    }

    get object(): any {
        return this._jsobj;
    }

    static Unserialize(str: string): Variant {
        if (!str)
            return null;
        let t = new Variant(null);
        if (!t.unserialize(str))
            return null;
        return t;
    }

    private _raw: any;
    private _type = VariantType.UNKNOWN;

    private _buf: Buffer;
    private _str: string;
    private _bol: boolean;
    private _num: number;
    private _jsobj: IndexedObject;

    get value(): any {
        if (this._type == VariantType.STRING)
            return this._str;
        else if (this._type == VariantType.BUFFER)
            return this._buf;
        else if (this._type == VariantType.OBJECT)
            return this._jsobj;
        else if (this._type == VariantType.BOOLEAN)
            return this._bol;
        else if (this._type == VariantType.NUMBER)
            return this._num;
        return null;
    }

    set value(v: any) {
        if (this._type == VariantType.STRING)
            this._str = v;
        else if (this._type == VariantType.BUFFER)
            this._buf = v;
        else if (this._type == VariantType.OBJECT)
            this._jsobj = v;
        else if (this._type == VariantType.BOOLEAN)
            this._bol = v;
        else if (this._type == VariantType.NUMBER)
            this._num = v;
    }

    toBuffer(): Buffer {
        if (this._buf)
            return this._buf;
        this._buf = new Buffer(this.toString());
        return this._buf;
    }

    toString(): string {
        if (this._str)
            return this._str;
        if (this._type == VariantType.BUFFER)
            this._str = this._buf.toString();
        else if (this._type == VariantType.OBJECT)
            this._str = toJson(this._jsobj);
        else if (this._type == VariantType.BOOLEAN)
            this._str = this._bol ? "true" : "false";
        else if (this._type == VariantType.NUMBER)
            this._str = this._num.toString();
        return this._str;
    }

    toJsObj(): IndexedObject {
        if (this._jsobj)
            return this._jsobj;
        this._jsobj = toJsonObject(this.toString());
        return this._jsobj;
    }

    // 序列化
    serialize(): string {
        let s: IndexedObject = {_t: this._type, _i: "vo", _d: this.value};
        return toJson(s);
    }

    unserialize(str: string): boolean {
        let obj: any = toJsonObject(str);
        if (!obj)
            return false;
        if (obj._i != "vo") {
            switch (typeof obj) {
                case "number": {
                    this._type = VariantType.NUMBER;
                    this._num = obj;
                    return true;
                }
                case "string": {
                    this._type = VariantType.STRING;
                    this._str = obj;
                    return true;
                }
                case "boolean": {
                    this._type = VariantType.BOOLEAN;
                    this._bol = obj;
                    return true;
                }
            }
            return false;
        }
        this._type = obj._t;
        this.value = obj._d;
        return true;
    }
}

export class Stream {

    bindRead(stm: NodeJS.ReadableStream): this {
        stm.on("ready", ()=>{

        });
        this._from = stm;
        this._output = false;
        return this;
    }

    pipe(stm: NodeJS.WritableStream): boolean {
        if (this._from) {
            this._from.pipe(stm);
            return true;
        }
        return false;
    }

    toBuffer(): Promise<Buffer> {
        return new Promise(resolve => {
            if (this._output || !this._from) {
                resolve(null);
                return;
            }
            let stm = new stmbuf.WritableStreamBuffer();
            stm.on("error", err => {
                logger.error(err);
                resolve(null);
            });
            stm.on("finish", () => {
                this._output = true;
                resolve(stm.getContents());
            });
            this._from.pipe(stm);
        });
    }

    // 保存成文件
    toFile(ph: string): Promise<boolean> {
        return new Promise(resolve => {
            if (this._output || !this._from) {
                resolve(false);
                return;
            }
            let stm = fs.createWriteStream(ph);
            stm.on("error", err => {
                logger.error(err);
                resolve(false);
            });
            stm.on("finish", () => {
                this._output = true;
                resolve(true);
            });
            this._from.pipe(stm);
        });
    }

    private _from: NodeJS.ReadableStream;
    private _output: boolean = true;
}