import {Session} from "./session";
import {StringT, toFloat, toInt, toJson} from "./utils";
import {IMedia} from "./media";

export type Class<T> = { new(...args: any[]): T, [key: string]: any };
export type AnyClass = Class<any>;
export type IndexedObject = { [key: string]: any };
export type clazz_type = AnyClass | string;
export type jsonobj = string | Object;

// 实现一个兼容map
export class CMap<K, V> {
    private _keys = new Array<K>();
    private _vals = new Array<V>();
    private _store: any = {};

    set(k: K, v: V) {
        if (<any>k in this._store) {
            let idx = this._store[<any>k];
            this._vals[idx] = v;
        }
        else {
            let idx = this._vals.length;
            this._keys.push(k);
            this._vals.push(v);
            this._store[k] = idx;
        }
    }

    get(k: K): V {
        let idx = this._store[k];
        if (idx == -1)
            return null;
        return this._vals[idx];
    }

    has(k: K): boolean {
        return <any>k in this._store;
    }

    delete(k: K) {
        if (<any>k in this._store) {
            let idx = this._store[<any>k];
            this._keys[idx] = null;
            this._vals[idx] = null;
            delete this._store[k];
        }
    }

    clear() {
        this._keys.length = 0;
        this._vals.length = 0;
        this._store = {};
    }

    forEach(cb: (v: any, k: any) => void) {
        this._keys.forEach((k, idx) => {
            if (k === null)
                return;
            cb(this._vals[idx], k);
        });
    }
}

declare let Map: any;
if (typeof Map == "undefined")
    Map = CMap;

export enum HttpMethod {
    GET = 0,
    POST = 1,
}

export enum SocketMethod {
    JSON = 0,
    PROTOBUF = 1,
}

interface FieldOption {
    // 唯一序号，后续类似pb的协议会使用id来做数据版本兼容
    id: number;

    // 默认值
    val?: any;

    // 可选
    optional: boolean;

    // 读取控制
    input: boolean;
    output: boolean;

    // 类型标签
    array?: boolean;
    map?: boolean;
    string?: boolean;
    integer?: boolean;
    double?: boolean;
    boolean?: boolean;
    enum?: boolean;
    file?: boolean;
    json?: boolean;

    // 注释
    comment?: string;

    // 关联类型
    keytype?: clazz_type;
    valtype?: clazz_type;
}

export interface IResponseData {
    code: number,
    data: any
}

export class RequestParams {
    fields: { [key: string]: any } = {};
    files: { [key: string]: File } = {};
    medias: { [key: string]: IMedia } = {};
}

export interface Paged {
    last: number;
    limit: number;
    items: any[];
    all: any[];
    ended: boolean;
}

export abstract class Base {
    [key: string]: any;

    // 请求的服务器地址
    host: string;

    // websocket的地址
    wshost: string;

    // 返回码
    code: number;

    // 错误消息
    error: string;

    // 请求动作
    action: string;

    // 请求方式
    method: HttpMethod = HttpMethod.GET;
    binary: SocketMethod = SocketMethod.JSON;

    // 组装请求的url
    abstract requestUrl(): string;

    // 显示等待的交互，客户端重载来实现具体的等待UI
    showWaiting() {
        // pass
    }

    hideWaiting() {
        // pass
    }

    // 是否需要显示等待
    enableWaiting: boolean = true;

    // != 0 代表打开cache，访问会优先命中cache，可以通过设置cacheFlush来强制刷新一次
    cacheTime: number;

    // 是否强制刷新一次cache
    cacheFlush: boolean;

    // 本次是从cache出来的结果还是强刷拿到的结果
    protected _cacheUpdated: boolean;
    get cacheUpdated(): boolean {
        return this._cacheUpdated;
    }

    keyForCache(): number {
        let t = Encode(this);
        let s = [];
        for (let key in t) {
            let val = t[key];
            if (val == null)
                s.push("key=");
            else if (val instanceof File)
                return null; // 如果包含文件，则认为不支持缓存
            else
                s.push("key=" + val);
        }
        if (Session.SID)
            s.push(Session.SID)
        s.push(this.action);
        s.push(this.host);
        s.push(this.port);
        return StringT.Hash(s.join("\x19\xaf")); // 用一个很特殊的数据分隔(0x19af是随便选的)
    }

    // 组装请求的参数集
    requestParams(): RequestParams {
        let t = Encode(this);
        let r = new RequestParams();

        // 先设置额外的参数，使得徒手设置的参数优先级最高
        if (this.additionParams) {
            for (let k in this.additionParams) {
                let v = this.additionParams[k];
                if (typeof v == "object")
                    v = toJson(v);
                r.fields[k] = v;
            }
        }
        if (this.additionFiles) {
            for (let k in this.additionFiles) {
                let v = this.additionFiles[k];
                r.files[k] = v;
            }
        }
        if (this.additionMedias) {
            for (let k in this.additionMedias) {
                let v = this.additionMedias[k];
                r.medias[k] = v;
            }
        }

        // 设置徒手参数
        for (let key in t) {
            let val = t[key];
            if (val == null)
                continue;
            if (val instanceof File) {
                r.files[key] = val;
            }
            else if (val.save) {
                r.medias[key] = val;
            }
            else {
                r.fields[key] = val;
            }
        }

        // 设置保留参数
        if (Session.SID)
            r.fields["_sid"] = Session.SID;
        r.fields["_cid"] = Session.CID;
        r.fields["_cmid"] = this.cmid;
        if (Session.NOC)
            r.fields["_noc"] = 1;
        return r;
    }

    additionParams: IndexedObject = null;
    additionFiles: IndexedObject = null;
    additionMedias: IndexedObject = null;

    // 处理响应的结果
    parseData(data: IResponseData, suc: () => void, error: (err: Error) => void) {
        if (data.data) {
            this.data = data.data;
            // 把data的数据写入model中
            Decode(this, this.data);
        }

        this.code = data.code == null ? -1 : data.code;
        if (this.code < 0) {
            error(new Error("错误码:" + this.code));
        }
        else {
            try {
                suc();
            }
            catch (err) {
                console.error(err);
                error(err);
            }
        }
    }

    // 此次访问服务端返回的数据
    data: any;

    // 构造一个请求对象
    static NewRequest<T extends Base>(req: any): T {
        let clz: any = req[1];
        let r = new clz();
        r.action = req[0];
        return r;
    }

    // 对应api.ts中生成的实现，用来在ClientSDK中使用到impl中的类
    static BindImpl(api: any, models: any, routers: any) {
        Base.Impl.api = api;
        Base.Impl.models = models;
        Base.Impl.routers = routers;
    }

    static Impl: any = {api: null, models: null, routers: null};
    static _COUNTER = 1;
    hashCode = Base._COUNTER++;
    cmid = this.hashCode + "@" + Session.CID;

    // --------------从core.proto中移植过来的

    static string_t = "string";
    static integer_t = "integer";
    static double_t = "double";
    static boolean_t = "boolean";

    // 可选的参数
    static optional = "optional";

    // 必须的参数，不提供则忽略
    static required = "required";

    // 输入输出
    static input = "input";
    static output = "output";

    static string(id: number, opts: string[], comment?: string): (target: any, key: string) => void {
        let fp: FieldOption = {
            id: id,
            val: "",
            input: opts.indexOf(Base.input) != -1,
            output: opts.indexOf(Base.output) != -1,
            optional: opts.indexOf(Base.optional) != -1,
            string: true,
            comment: comment
        };
        return (target: any, key: string) => {
            DefineFp(target, key, fp);
        };
    }

    static boolean(id: number, opts: string[], comment?: string): (target: any, key: string) => void {
        let fp: FieldOption = {
            id: id,
            val: false,
            input: opts.indexOf(Base.input) != -1,
            output: opts.indexOf(Base.output) != -1,
            optional: opts.indexOf(Base.optional) != -1,
            boolean: true,
            comment: comment
        };
        return (target: any, key: string) => {
            DefineFp(target, key, fp);
        };
    }

    static integer(id: number, opts: string[], comment?: string): (target: any, key: string) => void {
        let fp: FieldOption = {
            id: id,
            val: 0,
            input: opts.indexOf(Base.input) != -1,
            output: opts.indexOf(Base.output) != -1,
            optional: opts.indexOf(Base.optional) != -1,
            integer: true,
            comment: comment
        };
        return (target: any, key: string) => {
            DefineFp(target, key, fp);
        };
    }

    static double(id: number, opts: string[], comment?: string): (target: any, key: string) => void {
        let fp: FieldOption = {
            id: id,
            val: 0.,
            input: opts.indexOf(Base.input) != -1,
            output: opts.indexOf(Base.output) != -1,
            optional: opts.indexOf(Base.optional) != -1,
            double: true,
            comment: comment
        };
        return (target: any, key: string) => {
            DefineFp(target, key, fp);
        };
    }

    // 定义数组
    static array(id: number, clz: clazz_type, opts: string[], comment?: string): (target: any, key: string) => void {
        let fp: FieldOption = {
            id: id,
            input: opts.indexOf(Base.input) != -1,
            output: opts.indexOf(Base.output) != -1,
            optional: opts.indexOf(Base.optional) != -1,
            array: true,
            valtype: clz,
            comment: comment
        };
        return (target: any, key: string) => {
            DefineFp(target, key, fp);
        };
    }

    // 定义映射表
    static map(id: number, keytyp: clazz_type, valtyp: clazz_type, opts: string[], comment?: string): (target: any, key: string) => void {
        let fp: FieldOption = {
            id: id,
            input: opts.indexOf(Base.input) != -1,
            output: opts.indexOf(Base.output) != -1,
            optional: opts.indexOf(Base.optional) != -1,
            map: true,
            keytype: keytyp,
            valtype: valtyp,
            comment: comment
        };
        return (target: any, key: string) => {
            DefineFp(target, key, fp);
        };
    }

    // json对象
    static json(id: number, opts: string[], comment?: string): (target: any, key: string) => void {
        let fp: FieldOption = {
            id: id,
            input: opts.indexOf(Base.input) != -1,
            output: opts.indexOf(Base.output) != -1,
            optional: opts.indexOf(Base.optional) != -1,
            json: true,
            comment: comment
        };
        return (target: any, key: string) => {
            DefineFp(target, key, fp);
        };
    }

    // 使用其他类型
    static type(id: number, clz: clazz_type, opts: string[], comment?: string): (target: any, key: string) => void {
        let fp: FieldOption = {
            id: id,
            input: opts.indexOf(Base.input) != -1,
            output: opts.indexOf(Base.output) != -1,
            optional: opts.indexOf(Base.optional) != -1,
            valtype: clz,
            comment: comment
        };
        return (target: any, key: string) => {
            DefineFp(target, key, fp);
        };
    }

    // 枚举
    static enumerate(id: number, clz: any, opts: string[], comment?: string): (target: any, key: string) => void {
        let fp: FieldOption = {
            id: id,
            input: opts.indexOf(Base.input) != -1,
            output: opts.indexOf(Base.output) != -1,
            optional: opts.indexOf(Base.optional) != -1,
            valtype: clz,
            enum: true,
            comment: comment
        };
        return (target: any, key: string) => {
            DefineFp(target, key, fp);
        };
    }

    // 文件类型
    static file(id: number, opts: string[], comment?: string): (target: any, key: string) => void {
        let fp: FieldOption = {
            id: id,
            input: opts.indexOf(Base.input) != -1,
            output: opts.indexOf(Base.output) != -1,
            optional: opts.indexOf(Base.optional) != -1,
            file: true,
            comment: comment
        };
        return (target: any, key: string) => {
            DefineFp(target, key, fp);
        };
    }
}

const FP_KEY = "__fieldproto";

function CloneFps(fps: IndexedObject): IndexedObject {
    let r: IndexedObject = {};
    for (let k in fps) {
        r[k] = LightClone(fps[k]);
    }
    return r;
}

function LightClone(tgt: any): any {
    let r: IndexedObject = {};
    for (let k in tgt) {
        r[k] = tgt[k];
    }
    return r;
}

function DefineFp(target: any, key: string, fp: FieldOption) {
    let fps: IndexedObject;
    if (target.hasOwnProperty(FP_KEY)) {
        fps = target[FP_KEY];
    }
    else {
        if (FP_KEY in target) {
            fps = CloneFps(target[FP_KEY]);
            for (let k in fps) {
                let fp: FieldOption = fps[k];
                fp.id *= Session.MODEL_FIELDS_MAX;
            }
        }
        else {
            fps = {};
        }
        Object.defineProperty(target, FP_KEY, {
            enumerable: false,
            get: () => {
                return fps;
            }
        });
    }
    fps[key] = fp;
    Object.defineProperty(target, key, {
        value: fp.val,
        writable: true
    });
    // 生成get/set方法，便于客户端连写
    let proto = target.constructor.prototype;
    let nm = StringT.UpcaseFirst(key);
    proto["get" + nm] = function () {
        return this[key];
    };
    proto["set" + nm] = function (val: any) {
        this[key] = val;
        return this;
    };
}

export function GetFieldOptions(mdl: any): any {
    return mdl[FP_KEY];
}

// 检查模型和输入数据的匹配情况，简化模式（不处理第二级）
export function CheckInput(proto: any, params: any): boolean {
    let fps = proto[FP_KEY];
    if (fps == null)
        return true;
    for (let key in fps) {
        let val: FieldOption = fps[key];
        if (val.input && !val.optional && !(key in params))
            return false;
    }
    return true;
}

export const string_t = "string";
export const integer_t = "integer";
export const double_t = "double";
export const boolean_t = "boolean";

// 填数据
export function Decode(mdl: any, params: any) {
    let fps = mdl[FP_KEY];
    if (!fps)
        return;
    for (let key in params) {
        let fp: FieldOption = fps[key];
        if (fp == null) // 注意这边和core/proto有些不同，不去判断input的类型
            continue;
        let val = params[key];
        if (fp.valtype) {
            if (fp.array) {
                let arr = new Array();
                if (val) {
                    if (typeof(fp.valtype) == "string") {
                        if (fp.valtype == string_t) {
                            val.forEach((e: any) => {
                                arr.push(e ? e.toString() : null);
                            });
                        }
                        else if (fp.valtype == integer_t) {
                            val.forEach((e: any) => {
                                arr.push(e ? toInt(e) : 0);
                            });
                        }
                        else if (fp.valtype == double_t) {
                            val.forEach((e: any) => {
                                arr.push(e ? toFloat(e) : 0);
                            });
                        }
                        else if (fp.valtype == boolean_t)
                            val.forEach((e: any) => {
                                arr.push(!!e);
                            });
                    }
                    else {
                        let clz: any = fp.valtype;
                        val.forEach((e: any) => {
                            if (e == null) {
                                arr.push(null);
                            }
                            else {
                                let t = new clz();
                                Decode(t, e);
                                arr.push(t);
                            }
                        });
                    }
                }
                mdl[key] = arr;
            }
            else if (fp.map) {
                let keyconv = (v: any) => {
                    return v
                };
                if (fp.keytype == integer_t)
                    keyconv = toInt;
                else if (fp.keytype == double_t)
                    keyconv = toFloat;
                let map = new Map();
                if (val) {
                    if (typeof(fp.valtype) == "string") {
                        if (fp.valtype == string_t) {
                            for (let ek in val) {
                                let ev = val[ek];
                                map.set(keyconv(ek), ev ? ev.toString() : null);
                            }
                        }
                        else if (fp.valtype == integer_t) {
                            for (let ek in val) {
                                let ev = val[ek];
                                map.set(keyconv(ek), ev ? toInt(ev) : 0);
                            }
                        }
                        else if (fp.valtype == double_t) {
                            for (let ek in val) {
                                let ev = val[ek];
                                map.set(keyconv(ek), ev ? toFloat(ev) : 0);
                            }
                        }
                        else if (fp.valtype == boolean_t)
                            for (let ek in val) {
                                let ev = val[ek];
                                map.set(keyconv(ek), !!ev);
                            }
                    }
                    else {
                        let clz: any = fp.valtype;
                        for (let ek in val) {
                            let ev = val[ek];
                            if (ev == null) {
                                map.set(keyconv(ek), null);
                            }
                            else {
                                let t = new clz();
                                Decode(t, ev);
                                map.set(keyconv(ek), t);
                            }
                        }
                    }
                }
                mdl[key] = map;
            }
            else if (fp.enum) {
                mdl[key] = val ? parseInt(val) : 0;
            }
            else if (fp.valtype == Object) {
                mdl[key] = val;
            }
            else if (val) {
                let clz: any = fp.valtype;
                let t = new clz();
                Decode(t, val);
                mdl[key] = t;
            }
        }
        else {
            if (fp.string)
                mdl[key] = val ? val.toString() : null;
            else if (fp.integer)
                mdl[key] = val ? toInt(val) : 0;
            else if (fp.double)
                mdl[key] = val ? toFloat(val) : 0;
            else if (fp.boolean)
                mdl[key] = toBoolean(val);
            else if (fp.json)
                mdl[key] = val;
            else if (fp.file)
                mdl[key] = val;
        }
    }
    // 处理内置参数
    if ("_mid" in params)
        mdl["_mid"] = params["_mid"];
}

export function toBoolean(v: any): boolean {
    if (v == "true")
        return true;
    else if (v == "false")
        return false;
    return !!v;
}

// 把所有input的数据拿出来
export function Encode(mdl: any): any {
    let fps = mdl[FP_KEY];
    if (fps == null)
        return null;
    let r: IndexedObject = {};
    for (let key in fps) {
        let fp: FieldOption = fps[key];
        if (!fp.input || !mdl.hasOwnProperty(key))
            continue;
        let v = mdl[key];
        if (v == null)
            continue;
        // 如果是对象，则需要在encode一次
        if (fp.valtype && !fp.enum && typeof fp.valtype != "string")
            r[key] = JSON.stringify(Encode(v));
        else
            r[key] = v;
    }
    return r;
}

// 收集model的输出
export function Output(mdl: any): any {
    if (!mdl)
        return {};
    let fps = mdl[FP_KEY];
    let r: IndexedObject = {};
    for (let fk in fps) {
        let fp: FieldOption = fps[fk];
        if (!fp.output)
            continue;
        let val = mdl[fk];
        if (fp.valtype) {
            if (fp.array) {
                // 通用类型，则直接可以输出
                if (typeof(fp.valtype) == "string") {
                    r[fk] = val;
                }
                else {
                    // 特殊类型，需要迭代进去
                    let arr = new Array();
                    val && val.forEach((e: any) => {
                        arr.push(Output(e));
                    });
                    r[fk] = arr;
                }
            }
            else if (fp.map) {
                let m: IndexedObject = {};
                if (val) {
                    if (typeof(fp.valtype) == "string") {
                        val.forEach((v: any, k: any) => {
                            m[k] = v;
                        });
                    }
                    else {
                        val.forEach((v: any, k: any) => {
                            m[k] = Output(v);
                        });
                    }
                }
                r[fk] = m;
            }
            else if (fp.valtype == Object) {
                r[fk] = val;
            }
            else {
                r[fk] = Output(val);
            }
        }
        else {
            r[fk] = val;
        }
    }
    return r;
}

export interface MidInfo {
    user: string;
    domain: string;
    resources?: string[];
}

export function mid_unparse(info: MidInfo): string {
    let r = info.user + "@" + info.domain;
    if (info.resources && info.resources.length)
        r += "/" + info.resources.join("/");
    return r;
}
