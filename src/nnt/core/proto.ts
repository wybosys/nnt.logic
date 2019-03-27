// 协议数据定义
import {
    AnyClass,
    ArrayT,
    asString,
    IndexedObject,
    IntFloat,
    Multimap,
    ObjectT,
    toBoolean,
    toDouble,
    toInt,
    toJsonObject,
    toNumber,
    ToObject,
    UploadedFileHandle
} from "./kernel";
import {Config} from "../manager/config";
import {logger} from "./logger";
import {Filter} from "../store/filter";

export interface IUpdatable {
    updateData(): void;
}

export function UpdateData(obj: any) {
    obj && obj.updateData && obj.updateData();
}

// model的参数

// 隐藏该model
export const hidden = "hidden";

// 需要登录
export const auth = "auth";

// 是一个枚举
export const enumm = "enumm";

// 定义一组const对象
export const constant = "constant";

// field的参数
// 可选的参数
export const optional = "optional";

// 必须的参数，不提供则忽略
export const required = "required";

// 输入输出
export const input = "input";
export const output = "output";

// 为了给array定义数据，不能直接用系统类型
export const string_t = "string";
export const integer_t = "integer";
export const double_t = "double";
export const number_t = "number";
export const boolean_t = "boolean";

// 文件类型
export type FileType = UploadedFileHandle | string;

export interface ModelOption {

    // 需要登陆验证
    auth: boolean;

    // 是否是枚举类型，因为语言限制，无法对enum对象添加decorate处理，只能在服务器端使用class来模拟
    enum: boolean;

    // 用来定义常量，或者模拟str的枚举
    constant: boolean;

    // 隐藏后就不会加入到models列表中
    hidden: boolean;

    // 父类，目前用来生成api里面的父类名称
    parent: any;
}

type clazz_type = AnyClass | string;

export interface FieldValidProc {
    status?: number; // 可以附加一个错误码

    (inp: any): boolean; // 当返回false时，即为验证失败，此时上层可以通过获取status来返回特定的错误状态码
}

export interface FieldOption {

    // 唯一序号，后续类似pb的协议会使用id来做数据版本兼容
    id: number;

    // 可选
    optional: boolean;

    // 读取控制
    input: boolean;
    output: boolean;

    // 类型标签
    array?: boolean;
    map?: boolean;
    multimap?: boolean;
    string?: boolean;
    integer?: boolean;
    double?: boolean;
    number?: boolean;
    boolean?: boolean;
    enum?: boolean;
    file?: boolean;
    json?: boolean;
    filter?: boolean;
    intfloat?: number;

    // 关联类型
    keytype?: clazz_type;
    valtype?: clazz_type;

    comment?: string; // 注释

    // 有效性检查函数
    valid?: FieldValidProc;
}

export const MP_KEY = "__modelproto";
export const FP_KEY = "__fieldproto";
export const OWNFP_KEY = "__ownfieldproto";

export function GetAllFields(mdl: any): { [key: string]: FieldOption } {
    return mdl[FP_KEY];
}

export function GetAllOwnFields(mdl: any): { [key: string]: FieldOption } {
    return mdl[OWNFP_KEY];
}

export function GetModelInfo(clz: any): ModelOption {
    return clz[MP_KEY];
}

// 是否是模型
export function IsModel(clz: any): boolean {
    return clz[MP_KEY] != null;
}

// 是否需要登陆验证
export function IsNeedAuth(mdl: any): boolean {
    let clz = mdl.constructor;
    let mp: ModelOption = clz[MP_KEY];
    return mp ? mp.auth : false;
}

// 当class用model描述时，自动注册model
let models = new Map<string, any>();

// 描述model;''
export function model(opts?: string[], parent?: AnyClass): (target: any) => void {
    let mp: ModelOption = {
        auth: opts ? opts.indexOf(auth) != -1 : false,
        enum: opts ? opts.indexOf(enumm) != -1 : false,
        constant: opts ? opts.indexOf(constant) != -1 : false,
        hidden: opts ? opts.indexOf(hidden) != -1 : false,
        parent: parent
    };
    return (target: any) => {
        /*
        热更时会弹出同名的提示，所以先放开对于model的限制，理论上，好好写代码的话，是不会出现同名model的情况，因为当前amd的架构不存在namespace
        if (models.has(target.name)) {
            logger.fatal("存在同名的model类 {{=it.name}}", {name: target.name});
            return;
        }
        */
        models.set(target.name, target);
        Object.defineProperty(target, MP_KEY, {
            enumerable: false,
            get: () => {
                return mp
            }
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
    } else {
        // 需要从父类copy一下fps
        if (FP_KEY in target) {
            fps = CloneFps(target[FP_KEY]);
            // 继承过来的id需要放大指定倍数，避免重复
            for (let k in fps) {
                let fp: FieldOption = fps[k];
                fp.id *= Config.MODEL_FIELDS_MAX;
            }
        } else {
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

function field(id: number, opts: string[], comment: string, valid: FieldValidProc): FieldOption {
    return {
        id: id,
        input: opts.indexOf(input) != -1,
        output: opts.indexOf(output) != -1,
        optional: opts.indexOf(optional) != -1,
        comment: comment,
        valid: valid
    };
}

function ensureClazz(clz: any): any {
    if (clz)
        return clz;
    console.error("proto设置的类型定义为null，请检查模型文件的引用关系");
    return Object;
}

// 定义数据类型, id 从 1 开始
export function string(id: number, opts: string[], comment?: string, valid?: FieldValidProc): (target: any, key: string) => void {
    let fp = field(id, opts, comment, valid);
    fp.string = true;
    return (target: any, key: string) => {
        DefineFp(target, key, fp);
    };
}

export function boolean(id: number, opts: string[], comment?: string, valid?: FieldValidProc): (target: any, key: string) => void {
    let fp = field(id, opts, comment, valid);
    fp.boolean = true;
    return (target: any, key: string) => {
        DefineFp(target, key, fp);
    };
}

export function integer(id: number, opts: string[], comment?: string, valid?: FieldValidProc): (target: any, key: string) => void {
    let fp = field(id, opts, comment, valid);
    fp.integer = true;
    return (target: any, key: string) => {
        DefineFp(target, key, fp);
    };
}

export function double(id: number, opts: string[], comment?: string, valid?: FieldValidProc): (target: any, key: string) => void {
    let fp = field(id, opts, comment, valid);
    fp.double = true;
    return (target: any, key: string) => {
        DefineFp(target, key, fp);
    };
}

export function number(id: number, opts: string[], comment?: string, valid?: FieldValidProc): (target: any, key: string) => void {
    let fp = field(id, opts, comment, valid);
    fp.number = true;
    return (target: any, key: string) => {
        DefineFp(target, key, fp);
    };
}

// 现在intfloat只能用于普通变量，不支持放到结构之中
export function intfloat(id: number, scale: number, opts: string[], comment?: string, valid?: FieldValidProc): (target: any, key: string) => void {
    let fp = field(id, opts, comment, valid);
    fp.intfloat = scale;
    return (target: any, key: string) => {
        DefineFp(target, key, fp);
    };
}

// 百分数格式化至 0-10000之间
export function percentage(id: number, opts: string[], comment?: string, valid?: FieldValidProc): (target: any, key: string) => void {
    return intfloat(id, 10000, opts, comment, valid);
}

// 钱格式化到 0-100 之间
export function money(id: number, opts: string[], comment?: string, valid?: FieldValidProc): (target: any, key: string) => void {
    return intfloat(id, 100, opts, comment, valid);
}

// 定义数组
export function array(id: number, clz: clazz_type, opts: string[], comment?: string, valid?: FieldValidProc): (target: any, key: string) => void {
    let fp = field(id, opts, comment, valid);
    fp.array = true;
    fp.valtype = ensureClazz(clz);
    return (target: any, key: string) => {
        DefineFp(target, key, fp);
    };
}

// 定义映射表
export function map(id: number, keytyp: clazz_type, valtyp: clazz_type, opts: string[], comment?: string, valid?: FieldValidProc): (target: any, key: string) => void {
    let fp = field(id, opts, comment, valid);
    fp.map = true;
    fp.keytype = keytyp;
    fp.valtype = ensureClazz(valtyp);
    return (target: any, key: string) => {
        DefineFp(target, key, fp);
    };
}

export function multimap(id: number, keytyp: clazz_type, valtyp: clazz_type, opts: string[], comment?: string, valid?: FieldValidProc): (target: any, key: string) => void {
    let fp = field(id, opts, comment, valid);
    fp.multimap = true;
    fp.keytype = keytyp;
    fp.valtype = ensureClazz(valtyp);
    return (target: any, key: string) => {
        DefineFp(target, key, fp);
    };
}

// json对象
export function json(id: number, opts: string[], comment?: string, valid?: FieldValidProc): (target: any, key: string) => void {
    let fp = field(id, opts, comment, valid);
    fp.json = true;
    return (target: any, key: string) => {
        DefineFp(target, key, fp);
    };
}

// 使用其他类型
export function type(id: number, clz: clazz_type, opts: string[], comment?: string, valid?: FieldValidProc): (target: any, key: string) => void {
    let fp = field(id, opts, comment, valid);
    fp.valtype = ensureClazz(clz);
    return (target: any, key: string) => {
        DefineFp(target, key, fp);
    };
}

// 枚举
export function enumerate(id: number, clz: clazz_type | {}, opts: string[], comment?: string, valid?: FieldValidProc): (target: any, key: string) => void {
    let fp = field(id, opts, comment, valid);
    fp.valtype = ensureClazz(clz);
    fp.enum = true;
    return (target: any, key: string) => {
        DefineFp(target, key, fp);
    };
}

// 文件
export function file(id: number, opts: string[], comment?: string, valid?: FieldValidProc): (target: any, key: string) => void {
    let fp = field(id, opts, comment, valid);
    fp.file = true;
    return (target: any, key: string) => {
        DefineFp(target, key, fp);
    };
}

// 数据库的筛选器
export function filter(id: number, opts: string[], comment?: string, valid?: FieldValidProc): (target: any, key: string) => void {
    let fp = field(id, opts, comment, valid);
    fp.filter = true;
    return (target: any, key: string) => {
        DefineFp(target, key, fp);
    };
}

// 将数据从参数集写入到模型中的字段
export function Decode<T extends IndexedObject>(mdl: T, params: any, input = true, output = false): T {
    let fps = mdl[FP_KEY];
    if (fps == null)
        return mdl;
    for (let key in params) {
        let fp: FieldOption = fps[key];
        if (fp == null)
            continue;
        if (input && !fp.input)
            continue;
        if (output && !fp.output)
            continue;
        mdl[key] = DecodeValue(fp, params[key], input, output);
    }
    return mdl;
}

export function DecodeValue(fp: FieldOption, val: any, input = true, output = false): any {
    if (fp.valtype) {
        if (fp.array) {
            let arr: any[] = [];
            if (val) {
                if (typeof (fp.valtype) == "string") {
                    if (!(val instanceof Array)) {
                        // 对于array，约定用，来分割
                        val = val.split(",");
                    }
                    if (fp.valtype == string_t) {
                        val.forEach((e: any) => {
                            arr.push(e ? e.toString() : null);
                        });
                    } else if (fp.valtype == integer_t) {
                        val.forEach((e: any) => {
                            arr.push(toInt(e));
                        });
                    } else if (fp.valtype == double_t) {
                        val.forEach((e: any) => {
                            arr.push(toDouble(e));
                        });
                    } else if (fp.valtype == number_t) {
                        val.forEach((e: any) => {
                            arr.push(toNumber(e));
                        });
                    } else if (fp.valtype == boolean_t)
                        val.forEach((e: any) => {
                            arr.push(!!e);
                        });
                } else {
                    if (typeof val == "string")
                        val = toJsonObject(val);
                    if (val && val instanceof Array) {
                        let clz: any = fp.valtype;
                        val.forEach((e: any) => {
                            let t = new clz();
                            Decode(t, e, input, output);
                            arr.push(t);
                        });
                    } else {
                        logger.log("Array遇到了错误的数据 " + val);
                    }
                }
            }
            return arr;
        } else if (fp.map) {
            let map = new Map();
            if (typeof (fp.valtype) == "string") {
                if (fp.valtype == string_t) {
                    for (let ek in val) {
                        let ev = val[ek];
                        map.set(ek, ev ? ev.toString() : null);
                    }
                } else if (fp.valtype == integer_t) {
                    for (let ek in val) {
                        let ev = val[ek];
                        map.set(ek, toInt(ev));
                    }
                } else if (fp.valtype == double_t) {
                    for (let ek in val) {
                        let ev = val[ek];
                        map.set(ek, toDouble(ev));
                    }
                } else if (fp.valtype == number_t) {
                    for (let ek in val) {
                        let ev = val[ek];
                        map.set(ek, toNumber(ev));
                    }
                } else if (fp.valtype == boolean_t)
                    for (let ek in val) {
                        let ev = val[ek];
                        map.set(ek, !!ev);
                    }
            } else {
                let clz: any = fp.valtype;
                for (let ek in val) {
                    let ev = val[ek];
                    let t = new clz();
                    Decode(t, ev, input, output);
                    map.set(ek, t);
                }
            }
            return map;
        } else if (fp.multimap) {
            let mmap = new Multimap();
            if (typeof (fp.valtype) == "string") {
                if (fp.valtype == string_t) {
                    for (let ek in val) {
                        let ev = val[ek];
                        mmap.set(ek, ArrayT.Convert(ev, e => asString(e)));
                    }
                } else if (fp.valtype == integer_t) {
                    for (let ek in val) {
                        let ev = val[ek];
                        for (let ek in val) {
                            let ev = val[ek];
                            mmap.set(ek, ArrayT.Convert(ev, e => toInt(e)));
                        }
                    }
                } else if (fp.valtype == double_t) {
                    for (let ek in val) {
                        let ev = val[ek];
                        for (let ek in val) {
                            let ev = val[ek];
                            mmap.set(ek, ArrayT.Convert(ev, e => toDouble(e)));
                        }
                    }
                } else if (fp.valtype == number_t) {
                    for (let ek in val) {
                        let ev = val[ek];
                        for (let ek in val) {
                            let ev = val[ek];
                            mmap.set(ek, ArrayT.Convert(ev, e => toNumber(e)));
                        }
                    }
                } else if (fp.valtype == boolean_t) {
                    for (let ek in val) {
                        let ev = val[ek];
                        for (let ek in val) {
                            let ev = val[ek];
                            mmap.set(ek, ArrayT.Convert(ev, e => toBoolean(e)));
                        }
                    }
                }
            } else {
                let clz: any = fp.valtype;
                for (let ek in val) {
                    let ev = val[ek];
                    for (let ek in val) {
                        let ev = val[ek];
                        mmap.set(ek, ArrayT.Convert(ev, e => {
                            let t = new clz();
                            Decode(t, e, input, output);
                            return t;
                        }));
                    }
                }
            }
            return mmap;
        } else if (fp.enum) {
            return toInt(val);
        } else {
            if (typeof fp.valtype != "string")
                val = toJsonObject(val);
            if (fp.valtype == Object)
                return val;
            let clz: any = fp.valtype;
            let t = new clz();
            Decode(t, val, input, output);
            return t;
        }
    } else {
        if (fp.string)
            return asString(val);
        else if (fp.integer)
            return toInt(val);
        else if (fp.double)
            return toDouble(val);
        else if (fp.number)
            return toNumber(val);
        else if (fp.boolean)
            return toBoolean(val);
        else if (fp.enum)
            return toInt(val);
        else if (fp.json)
            return toJsonObject(val);
        else if (fp.filter)
            return Filter.Parse(val);
        else if (fp.intfloat)
            return IntFloat.From(toInt(val), fp.intfloat);
        else
            return val;
    }
}

// 把所有input的数据拿出来
export function Encode(mdl: any): IndexedObject {
    let r: any = {};
    let fps = mdl[FP_KEY];
    if (fps == null)
        return r;
    for (let key in fps) {
        let fp: FieldOption = fps[key];
        if (!fp.input)
            continue;
        let v = mdl[key];
        if (v == null)
            continue;
        if (fp.intfloat) {
            r[key] = IntFloat.From(v, fp.intfloat).origin;
        } else {
            r[key] = v;
        }
    }
    return r;
}

// 收集model的输出
export function Output(mdl: any): IndexedObject {
    if (!mdl)
        return null;
    let fps = mdl[FP_KEY];
    if (!fps)
        return null;
    let r: IndexedObject = {};
    for (let fk in fps) {
        let fp: FieldOption = fps[fk];
        if (!fp.output || !(fk in mdl)) // 不能和客户端一样删除掉对fk的判断，服务端会使用model直接扔到数据库中查询，去掉后会生成初始值查询字段
            continue;
        let val = mdl[fk];
        if (fp.valtype) {
            if (fp.array) {
                // 通用类型，则直接可以输出
                if (typeof (fp.valtype) == "string") {
                    let arr: any[] = [];
                    if (!val) {
                        // 处理val==null的情况
                    } else if (fp.valtype == string_t) {
                        val.forEach((e: any) => {
                            arr.push(e ? e.toString() : null);
                        });
                    } else if (fp.valtype == integer_t) {
                        val.forEach((e: any) => {
                            arr.push(toInt(e));
                        });
                    } else if (fp.valtype == double_t) {
                        val.forEach((e: any) => {
                            arr.push(toDouble(e));
                        });
                    } else if (fp.valtype == number_t) {
                        val.forEach((e: any) => {
                            arr.push(toNumber(e));
                        });
                    } else if (fp.valtype == boolean_t) {
                        val.forEach((e: any) => {
                            arr.push(!!e);
                        });
                    }
                    r[fk] = arr;
                } else {
                    // 特殊类型，需要迭代进去
                    let arr: any[] = [];
                    val && val.forEach((e: any) => {
                        arr.push(Output(e));
                    });
                    r[fk] = arr;
                }
            } else if (fp.map) {
                let m: IndexedObject = {};
                if (!val) {
                    // pass
                } else if (typeof (fp.valtype) == "string") {
                    val.forEach((v: any, k: string) => {
                        m[k] = v;
                    });
                } else {
                    val.forEach((v: any, k: string) => {
                        m[k] = Output(v);
                    });
                }
                r[fk] = m;
            } else if (fp.multimap) {
                let m: IndexedObject = {};
                if (!val) {
                    // pass
                } else if (typeof (fp.valtype) == "string") {
                    val.forEach((v: any[], k: string) => {
                        m[k] = v;
                    });
                } else {
                    val.forEach((v: any[], k: string) => {
                        m[k] = ArrayT.Convert(v, e => Output(e));
                    });
                }
                r[fk] = m;
            } else if (fp.enum) {
                r[fk] = toInt(val);
            } else {
                let v = Output(val);
                if (v == null)
                    v = ToObject(val);
                r[fk] = v;
            }
        } else {
            if (fp.string)
                r[fk] = asString(val);
            else if (fp.integer)
                r[fk] = toInt(val);
            else if (fp.double)
                r[fk] = toDouble(val);
            else if (fp.number)
                r[fk] = toNumber(val);
            else if (fp.boolean)
                r[fk] = !!val;
            else if (fp.enum)
                r[fk] = toInt(val);
            else if (fp.filter)
                r[fk] = val.toString();
            else if (fp.intfloat)
                r[fk] = IntFloat.From(val, fp.intfloat).origin;
            else {
                let v = Output(val);
                if (v == null)
                    v = ToObject(val);
                r[fk] = v;
            }
        }
    }
    // 输出内置的数据
    if ("_mid" in mdl)
        r["_mid"] = mdl["_mid"];
    return r;
}

export function FpToTypeDef(fp: FieldOption): string {
    let typ = "";
    if (fp.string) {
        typ = "string";
    } else if (fp.integer) {
        typ = "number";
    } else if (fp.double) {
        typ = "number";
    } else if (fp.number) {
        typ = "number";
    } else if (fp.boolean) {
        typ = "boolean";
    } else if (fp.intfloat) {
        typ = "number";
    } else if (fp.array) {
        typ = "Array<";
        if (typeof (fp.valtype) == "string") {
            let vt = "any";
            switch (fp.valtype) {
                case string_t:
                    vt = "string";
                    break;
                case double_t:
                case integer_t:
                case number_t:
                    vt = "number";
                    break;
                case boolean_t:
                    vt = "boolean";
                    break;
            }
            typ += vt;
        } else {
            typ += fp.valtype["name"];
        }
        typ += ">";
    } else if (fp.map) {
        typ = "Map<" + ValtypeDefToDef(fp.keytype) + ", " + ValtypeDefToDef(fp.valtype) + ">";
    } else if (fp.multimap) {
        typ = "Multimap<" + ValtypeDefToDef(fp.keytype) + ", " + ValtypeDefToDef(fp.valtype) + ">";
    } else if (fp.enum) {
        typ = (<AnyClass>fp.valtype)["name"];
    } else if (fp.file) {
        if (fp.input)
            typ = "any";
        else
            typ = "string";
    } else if (fp.filter) {
        typ = "string";
    } else if (fp.json) {
        typ = "Object";
    } else {
        typ = (<AnyClass>fp.valtype)["name"];
    }
    return typ;
}

function FpToOptionsDef(fp: FieldOption, ns = ""): string {
    let r = [];
    if (fp.input)
        r.push(ns + input);
    if (fp.output)
        r.push(ns + output);
    if (fp.optional)
        r.push(ns + optional);
    return "[" + r.join(", ") + "]";
}

function FpToValtypeDef(fp: FieldOption, ns = ""): string {
    let t = [];
    if (fp.keytype) {
        if (typeof (fp.keytype) == "string")
            t.push(ns + fp.keytype + "_t");
        else
            t.push(fp.keytype["name"]);
    }
    if (fp.valtype) {
        if (typeof (fp.valtype) == "string")
            t.push(ns + fp.valtype + "_t");
        else
            t.push(fp.valtype["name"]);
    }
    if (fp.intfloat) {
        t.push(fp.intfloat);
    }
    return t.join(", ");
}

function ValtypeDefToDef(def: clazz_type): string {
    switch (def) {
        case string_t:
            return "string";
        case double_t:
        case integer_t:
        case number_t:
            return "number";
        case boolean_t:
            return "boolean";
    }
    return (<any>def).name ? (<any>def).name : "undecl";
}

function FpToCommentDef(fp: FieldOption): string {
    return fp.comment ? ", \"" + fp.comment + "\"" : "";
}

export function FpToDecoDef(fp: FieldOption, ns = ""): string {
    let deco = null;
    if (fp.string)
        deco = "@" + ns + "string(" + fp.id + ", " + FpToOptionsDef(fp, ns) + FpToCommentDef(fp) + ")";
    else if (fp.integer)
        deco = "@" + ns + "integer(" + fp.id + ", " + FpToOptionsDef(fp, ns) + FpToCommentDef(fp) + ")";
    else if (fp.double)
        deco = "@" + ns + "double(" + fp.id + ", " + FpToOptionsDef(fp, ns) + FpToCommentDef(fp) + ")";
    else if (fp.number)
        deco = "@" + ns + "number(" + fp.id + ", " + FpToOptionsDef(fp, ns) + FpToCommentDef(fp) + ")";
    else if (fp.double)
        deco = "@" + ns + "number(" + fp.id + ", " + FpToOptionsDef(fp, ns) + FpToCommentDef(fp) + ")";
    else if (fp.intfloat)
        deco = "@" + ns + "intfloat(" + fp.id + ", " + FpToValtypeDef(fp, ns) + ", " + FpToOptionsDef(fp, ns) + FpToCommentDef(fp) + ")";
    else if (fp.boolean)
        deco = "@" + ns + "boolean(" + fp.id + ", " + FpToOptionsDef(fp, ns) + FpToCommentDef(fp) + ")";
    else if (fp.array) {
        deco = "@" + ns + "array(" + fp.id + ", " + FpToValtypeDef(fp, ns) + ", " + FpToOptionsDef(fp, ns) + FpToCommentDef(fp) + ")";
    } else if (fp.map) {
        deco = "@" + ns + "map(" + fp.id + ", " + FpToValtypeDef(fp, ns) + ", " + FpToOptionsDef(fp, ns) + FpToCommentDef(fp) + ")";
    } else if (fp.multimap) {
        deco = "@" + ns + "multimap(" + fp.id + ", " + FpToValtypeDef(fp, ns) + ", " + FpToOptionsDef(fp, ns) + FpToCommentDef(fp) + ")";
    } else if (fp.enum) {
        deco = "@" + ns + "enumerate(" + fp.id + ", " + FpToValtypeDef(fp, ns) + ", " + FpToOptionsDef(fp, ns) + FpToCommentDef(fp) + ")";
    } else if (fp.file) {
        deco = "@" + ns + "file(" + fp.id + ", " + FpToOptionsDef(fp, ns) + FpToCommentDef(fp) + ")";
    } else if (fp.filter) {
        deco = "@" + ns + "filter(" + fp.id + ", " + FpToOptionsDef(fp, ns) + FpToCommentDef(fp) + ")";
    } else if (fp.json) {
        deco = "@" + ns + "json(" + fp.id + ", " + FpToOptionsDef(fp, ns) + FpToCommentDef(fp) + ")";
    } else {
        deco = "@" + ns + "type(" + fp.id + ", " + FpToValtypeDef(fp, ns) + ", " + FpToOptionsDef(fp, ns) + FpToCommentDef(fp) + ")";
    }
    return deco;
}

export function FpToDecoDefPHP(fp: FieldOption): string {
    let deco = null;
    if (fp.string) {
        deco = "@Api(" + fp.id + ", [string], " + FpToOptionsDef(fp) + FpToCommentDef(fp) + ")";
        deco += "\n\t* @var string";
    } else if (fp.integer) {
        deco = "@Api(" + fp.id + ", [integer], " + FpToOptionsDef(fp) + FpToCommentDef(fp) + ")";
        deco += "\n\t* @var int";
    } else if (fp.double) {
        deco = "@Api(" + fp.id + ", [double], " + FpToOptionsDef(fp) + FpToCommentDef(fp) + ")";
        deco += "\n\t* @var double";
    } else if (fp.number) {
        deco = "@Api(" + fp.id + ", [number], " + FpToOptionsDef(fp) + FpToCommentDef(fp) + ")";
        deco += "\n\t* @var int|double";
    } else if (fp.boolean) {
        deco = "@Api(" + fp.id + ", [boolean], " + FpToOptionsDef(fp) + FpToCommentDef(fp) + ")";
        deco += "\n\t* @var boolean";
    } else if (fp.array) {
        deco = "@Api(" + fp.id + ", [array, " + FpToValtypeDef(fp) + "], " + FpToOptionsDef(fp) + FpToCommentDef(fp) + ")";
    } else if (fp.map) {
        deco = "@Api(" + fp.id + ", [map, " + FpToValtypeDef(fp) + "], " + FpToOptionsDef(fp) + FpToCommentDef(fp) + ")";
    } else if (fp.multimap) {
        deco = "@Api(" + fp.id + ", [multimap, " + FpToValtypeDef(fp) + "], " + FpToOptionsDef(fp) + FpToCommentDef(fp) + ")";
    } else if (fp.enum) {
        deco = "@Api(" + fp.id + ", [enum, " + FpToValtypeDef(fp) + "], " + FpToOptionsDef(fp) + FpToCommentDef(fp) + ")";
    } else if (fp.file) {
        deco = "@Api(" + fp.id + ", [file], " + FpToOptionsDef(fp) + FpToCommentDef(fp) + ")";
    } else if (fp.filter) {
        deco = "@Api(" + fp.id + ", [filter], " + FpToOptionsDef(fp) + FpToCommentDef(fp) + ")";
    } else if (fp.json) {
        deco = "@Api(" + fp.id + ", [json], " + FpToOptionsDef(fp) + FpToCommentDef(fp) + ")";
    } else {
        deco = "@Api(" + fp.id + ", [type, " + FpToValtypeDef(fp) + "], " + FpToOptionsDef(fp) + FpToCommentDef(fp) + ")";
    }
    return deco;
}
