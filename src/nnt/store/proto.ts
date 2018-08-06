// 数据库定义
import {AnyClass, IndexedObject, KvObject, ObjectT, toFloat, toInt, ToObject} from "../core/kernel";
import {double_t, integer_t} from "../core/proto";
import {GetClassName} from "../core/core";

export const key = "key";
export const subkey = "subkey";
export const notnull = "notnull";
export const autoinc = "autoinc";
export const unique = "unique";
export const unsign = "unsign";
export const zero = "zero";
export const desc = "desc";
export const strict = "strict"; // 默认：严格模式，以数据库中的数据为准
export const loose = "loose"; // 宽松模式，以传入的model对象为准

const MP_KEY = "__dbproto";
const FP_KEY = "__dbfieldproto";
export const OWNFP_KEY = "__owndbfieldproto";
const INNERID_KEY = "__innerid";

export interface TableSetting {
    ttl?: number; //生命期
}

export interface FieldSetting {
    ttl?: number; //生命期
}

export interface TableInfo {
    // 数据库连接名
    id: string;

    // 数据表名
    table: string;

    // 设置
    setting?: TableSetting;
}

type clazz_type = AnyClass | string;

export interface FieldOption {
    name?: string;

    string?: boolean;
    integer?: boolean;
    double?: boolean;
    boolean?: boolean;
    json?: boolean;
    array?: boolean;
    map?: boolean;

    keytype?: string;
    valtype?: clazz_type;

    key?: boolean; // 主键
    subkey?: boolean; // 次键
    notnull?: boolean; // 不能为空
    autoinc?: boolean; // 自增
    unique?: boolean; // 不重复
    unsign?: boolean;  // 无符号
    zero?: boolean; // 初始化为0
    desc?: boolean; // 递减
    loose?: boolean; // 宽松模式

    setting?: FieldSetting; // 字段设置
}

export function FpIsTypeEqual(l: FieldOption, r: FieldOption) {
    return l.string == r.string &&
        l.integer == r.integer &&
        l.double == r.double &&
        l.boolean == r.boolean &&
        l.json == r.json &&
        l.array == r.array &&
        l.map == r.map &&
        l.keytype == r.keytype &&
        l.valtype == r.valtype &&
        l.loose == r.loose;
}

// 是否是数据库模型
export function IsStoreModel(obj: any) {
    return obj[MP_KEY] != null;
}

// 获得数据库配置
export function GetStoreInfo(obj: any): TableInfo {
    return obj[MP_KEY];
}

export function GetFieldInfos(obj: any): KvObject<FieldOption> {
    return obj[FP_KEY];
}

export function GetInnerId(obj: any): any {
    return obj[INNERID_KEY];
}

export function SetInnerId(obj: any, id: any) {
    obj[INNERID_KEY] = id;
}

// 定义一个数据表模型，注意：数据表模型不能继承
export function table(dbid: string, tbnm: string, set?: TableSetting): (target: any) => void {
    let dp: TableInfo = {
        id: dbid,
        table: tbnm,
        setting: set
    };
    return (target: any) => {
        Object.defineProperty(target, MP_KEY, {
            enumerable: false,
            get: () => {
                return dp;
            }
        });
        Object.defineProperty(target, INNERID_KEY, {
            enumerable: false
        });
    };
}

function CloneFps(fps: IndexedObject): IndexedObject {
    let r: IndexedObject = {};
    for (let k in fps) {
        r[k] = ObjectT.LightClone(fps[k]);
    }
    return r;
}

// 服务端的model不能像客户端那样提供默认数据，避免直接用于查询时，生成不受控制的查询命令
function DefineFp(target: any, key: string, fp: FieldOption) {
    let fps: any, ownfps: any;
    if (target.hasOwnProperty(FP_KEY)) {
        fps = target[FP_KEY];
        ownfps = target[OWNFP_KEY];
    }
    else {
        if (FP_KEY in target) {
            fps = CloneFps(target[FP_KEY]);
        }
        else {
            fps = {};
        }
        ownfps = {};
        Object.defineProperty(target, FP_KEY, {
            enumerable: false,
            get: () => {
                return fps;
            }
        });
        Object.defineProperty(target, OWNFP_KEY, {
            enumerable: false,
            get: () => {
                return ownfps;
            }
        });
    }
    fps[key] = fp;
    ownfps[key] = fp;
}

function valtypedef(typ: clazz_type): string {
    if (typ == Object)
        return "object";
    if (typeof typ == "string")
        return typ;
    return GetClassName(typ);
}

// 返回定义的描述
export function coldef(fp: FieldOption): string {
    if (fp.boolean)
        return "boolean";
    if (fp.integer)
        return "integer";
    if (fp.double)
        return "double";
    if (fp.string)
        return "string";
    if (fp.json)
        return "json";
    if (fp.array) {
        return valtypedef(fp.valtype) + "[]";
    }
    if (fp.map) {
        return valtypedef(fp.keytype) + ":" + valtypedef(fp.valtype);
    }
    if (fp.valtype) {
        return valtypedef(fp.valtype);
    }
    return "undecl";
}

// 返回基础的定义结构，之后的都直接使用固定的类型函数来声明
function column(nm: string, opts: string[], set: FieldSetting): FieldOption {
    return {
        name: nm,
        key: opts ? opts.indexOf(key) != -1 : false,
        subkey: opts ? opts.indexOf(subkey) != -1 : false,
        notnull: opts ? opts.indexOf(notnull) != -1 : false,
        autoinc: opts ? opts.indexOf(autoinc) != -1 : false,
        unique: opts ? opts.indexOf(unique) != -1 : false,
        unsign: opts ? opts.indexOf(unsign) != -1 : false,
        zero: opts ? opts.indexOf(zero) != -1 : false,
        desc: opts ? opts.indexOf(desc) != -1 : false,
        loose: opts ? opts.indexOf(loose) != -1 : false,
        setting: set
    };
}

export function colstring(opts?: string[], set?: FieldSetting): (target: any, key: string) => void {
    return (target: any, key: string) => {
        let fp = column(key, opts, set);
        fp.string = true;
        DefineFp(target, key, fp);
    };
}

export function colboolean(opts?: string[], set?: FieldSetting): (target: any, key: string) => void {
    return (target: any, key: string) => {
        let fp = column(key, opts, set);
        fp.boolean = true;
        DefineFp(target, key, fp);
    };
}

export function colinteger(opts?: string[], set?: FieldSetting): (target: any, key: string) => void {
    return (target: any, key: string) => {
        let fp = column(key, opts, set);
        fp.integer = true;
        DefineFp(target, key, fp);
    };
}

export function coldouble(opts?: string[], set?: FieldSetting): (target: any, key: string) => void {
    return (target: any, key: string) => {
        let fp = column(key, opts, set);
        fp.double = true;
        DefineFp(target, key, fp);
    };
}

export function colarray(clz: clazz_type, opts?: string[], set?: FieldSetting): (target: any, key: string) => void {
    return (target: any, key: string) => {
        let fp = column(key, opts, set);
        fp.array = true;
        fp.valtype = clz;
        DefineFp(target, key, fp);
    };
}

export function colmap(keytyp: "string" | "integer" | "double", valtyp: clazz_type, opts?: string[], set?: FieldSetting): (target: any, key: string) => void {
    return (target: any, key: string) => {
        let fp = column(key, opts, set);
        fp.map = true;
        fp.keytype = keytyp;
        fp.valtype = valtyp;
        DefineFp(target, key, fp);
    };
}

export function coljson(opts?: string[], set?: FieldSetting): (target: any, key: string) => void {
    return (target: any, key: string) => {
        let fp = column(key, opts, set);
        fp.json = true;
        DefineFp(target, key, fp);
    };
}

export function coltype(clz: clazz_type, opts?: string[], set?: FieldSetting): (target: any, key: string) => void {
    return (target: any, key: string) => {
        let fp = column(key, opts, set);
        fp.valtype = clz;
        DefineFp(target, key, fp);
    };
}

// 填数据库对象
export function Decode(mdl: any, params: IndexedObject) {
    let fps = mdl[FP_KEY];
    if (fps == null)
        return;
    for (let key in params) {
        let fp: FieldOption = fps[key];
        if (fp == null)
            continue;
        let val = params[key];
        if (val == null) {
            if (!fp.loose)
                mdl[key] = null; // 从数据库读取数据时采用严格模式：字段如果在数据库中为null，则拿出来后也是null
            continue;
        }
        if (fp.valtype) {
            if (fp.array) {
                if (typeof(fp.valtype) == "string") {
                    mdl[key] = val;
                }
                else {
                    let clz: AnyClass = fp.valtype;
                    if (clz == Object) {
                        // object类似于json，不指定数据类型
                        mdl[key] = val;
                    }
                    else {
                        let arr = new Array();
                        val.forEach((e: any) => {
                            let t = new clz();
                            Decode(t, e);
                            arr.push(t);
                        });
                        mdl[key] = arr;
                    }
                }
            }
            else if (fp.map) {
                let map = new Map();
                let keyconv = (v: any) => {
                    return v
                };
                if (fp.keytype == integer_t)
                    keyconv = toInt;
                else if (fp.keytype == double_t)
                    keyconv = toFloat;
                if (typeof(fp.valtype) == "string") {
                    for (let ek in val)
                        map.set(keyconv(ek), val[ek]);
                }
                else {
                    let clz: AnyClass = fp.valtype;
                    for (let ek in val) {
                        let t = new clz();
                        Decode(t, val[ek]);
                        map.set(keyconv(ek), t);
                    }
                }
                mdl[key] = map;
            }
            else {
                let clz = <AnyClass>fp.valtype;
                if (clz == Object) {
                    mdl[key] = val;
                }
                else if (typeof val == "object") {
                    let t = new clz();
                    Decode(t, val);
                    mdl[key] = t;
                }
                else if (!fp.loose) {
                    mdl[key] = null;
                }
            }
        }
        else {
            mdl[key] = val;
        }
    }
}

export function Output(mdl: any, def: any = {}): IndexedObject {
    if (!mdl)
        return def;
    let fps = mdl[FP_KEY];
    if (!fps)
        return def;
    let r: IndexedObject = {};
    for (let fk in fps) {
        let fp: FieldOption = fps[fk];
        if (!(fk in mdl))
            continue;
        let val = mdl[fk];
        if (fp.valtype) {
            if (fp.array) {
                if (typeof fp.valtype == "string") {
                    r[fk] = val;
                }
                else {
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
                    if (typeof fp.valtype == "string") {
                        val.forEach((v: any, k: string) => {
                            m[k] = v; // 不需要转换key的类型，val为真实的Map对象
                        });
                    }
                    else {
                        val.forEach((v: any, k: string) => {
                            m[k] = Output(v);
                        });
                    }
                }
                r[fk] = m;
            }
            else {
                let v = Output(val, null);
                if (v == null)
                    v = ToObject(val);
                r[fk] = v;
            }
        }
        else {
            r[fk] = val;
        }
    }
    return r;
}
