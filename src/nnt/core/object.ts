import {Signals} from "./signals";
import {logger} from "./logger";
import {Classname} from "./v8";
import {IsDebug} from "../manager/config";
import {CancelDelay, Delay, DelayHandler} from "./time";
import {ArrayT, Class, IndexedObject, toJson, toJsonObject} from "./kernel";
import fs = require("fs");
import stmbuf = require("stream-buffers");

// 带计数器的基Object
export class OidObject {

    private static __cnter = 0;
    private _oid: number = ++OidObject.__cnter;

    get oid(): number {
        return this._oid;
    }
}

// 增加引用计数
export function grab<T>(o: T): T {
    if (o == null)
        return undefined;
    (<any>o).grab();
    return o;
}

// 减计数对象
export function drop<T>(o: T): T {
    if (o == null)
        return undefined;
    return (<any>o).drop();
}

// 直接析构一个对象
export function dispose<T>(o: T) {
    if (o == null)
        return;
    (<any>o).dispose();
}

// 序列化接口
export interface ISerializableObject {

    // 序列化
    serialize(): string;

    // 反序列化，序列化成功返回自身，不成功返回null
    unserialize(str: string): this;
}

// POD简单化对象接口
export interface IPodObject {

    // 转换为pod对象
    toPod(): IndexedObject;

    // 从pod对象转回, 成功返回this，失败返回null
    fromPod(obj: IndexedObject): this;
}

// 带信号的对象接口
export interface ISObject {
    signals: Signals;
}

// 基Object的接口
export interface IObject {
    dispose(): void;
}

// 引用计数的接口
export interface IReference {
    drop(): void;

    grab(): void;
}

// 基带引用Object的接口
export interface IRefObject
    extends IObject, IReference {
}

// 带信号的基Object
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

    /** 绑定一个生命期 */
    private _attachs: Array<any>;

    // 将另一个对象的生命期绑定到自己
    attachref(o: any) {
        // 如果不存在生命期维护，则直接放弃
        if (o.grab == undefined)
            return;
        if (this._attachs == null)
            this._attachs = new Array<any>();
        o.grab();
        this._attachs.push(o);
    }

    // 释放另一个绑定对象的生命期
    detachref(o: any) {
        if (o.drop == undefined)
            return;
        if (this._attachs == null)
            return;
        o.drop();
        ArrayT.RemoveObject(this._attachs, o);
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
        } else {
            const typ = typeof o;
            if (typ == "string") {
                this._type = VariantType.STRING;
                this._str = o;
            } else if (typ == "boolean") {
                this._type = VariantType.BOOLEAN;
                this._bol = o;
            } else if (typ == "number") {
                this._type = VariantType.NUMBER;
                this._num = o;
            } else {
                this._type = VariantType.OBJECT;
                this._jsobj = o;
            }
        }
    }

    get raw(): any {
        return this._raw;
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

    get object(): any {
        return this._jsobj;
    }

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

    unserialize(str: string): this {
        let obj: any = toJsonObject(str);
        if (!obj)
            return null;
        if (obj._i != "vo") {
            switch (typeof obj) {
                case "number": {
                    this._type = VariantType.NUMBER;
                    this._num = obj;
                    return this;
                }
                case "string": {
                    this._type = VariantType.STRING;
                    this._str = obj;
                    return this;
                }
                case "boolean": {
                    this._type = VariantType.BOOLEAN;
                    this._bol = obj;
                    return this;
                }
            }
            return null;
        }
        this._type = obj._t;
        this.value = obj._d;
        return this;
    }
}

export class Stream {

    bindRead(stm: NodeJS.ReadableStream): this {
        stm.on("ready", () => {

        });
        this._from = stm;
        this._output = false;
        return this;
    }

    pipe(stm: NodeJS.WritableStream): this {
        if (this._from) {
            this._from.pipe(stm);
            return this;
        }
        return null;
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
                resolve(<any>stm.getContents());
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

export class ReusableObjects<T> {

    constructor(clazz?: Class<T>) {
        this._clazz = clazz;
    }

    async use(clazz?: Class<T>): Promise<T> {
        let r = this._objects.pop();
        if (r)
            return r;
        return this.instance(clazz);
    }

    async unuse(obj: T, err?: any) {
        this._objects.push(obj);
    }

    async safe(cb: (obj: T) => Promise<void>, clazz?: Class<T>) {
        let t = await this.use(clazz);
        try {
            await cb(t);
            this.unuse(t);
        } catch (e) {
            this.unuse(t, e);
            throw e;
        }
    }

    protected async instance(clazz?: Class<T>): Promise<T> {
        if (!clazz)
            clazz = this._clazz;
        return new clazz();
    }

    clear() {
        this._objects.length = 0;
    }

    private _clazz: Class<T>;
    protected _objects: T[] = [];
}
