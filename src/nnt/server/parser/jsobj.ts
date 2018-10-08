import {AbstractParser} from "./parser";
import {boolean_t, double_t, FieldOption, FP_KEY, integer_t, string_t} from "../../core/proto";
import {STATUS} from "../../core/models";
import {
    ArrayT,
    asString,
    IndexedObject,
    IsEmpty,
    Multimap,
    toBoolean,
    toFloat,
    toInt,
    toJsonObject, UploadedFileHandle
} from "../../core/kernel";
import {logger} from "../../core/logger";

export class Jsobj extends AbstractParser {

    // 检查模型和输入数据的匹配情况，返回status的错误码
    checkInput(proto: any, params: IndexedObject): number {
        let fps = proto[FP_KEY];
        if (fps == null)
            return STATUS.OK;
        for (let key in fps) {
            let inp = params[key];
            let fp: FieldOption = fps[key];
            if (!fp.input)
                continue;
            if (fp.optional) {
                if (fp.valid && !IsEmpty(inp)) {
                    let v = this.decodeField(fp, inp, true, false);
                    if (!fp.valid(v))
                        return fp.valid.status != null ? fp.valid.status : STATUS.PARAMETER_NOT_MATCH;
                }
                continue;
            }
            if (IsEmpty(inp))
                return STATUS.PARAMETER_NOT_MATCH;
            // 判断是否合规
            if (fp.valid) {
                // 需要提前转换一下类型
                let v = this.decodeField(fp, inp, true, false);
                if (!fp.valid(v))
                    return fp.valid.status != null ? fp.valid.status : STATUS.PARAMETER_NOT_MATCH;
            }
        }
        return STATUS.OK;
    }

    // 根据属性定义解码数据
    decodeField(fp: FieldOption, val: any, input: boolean, output: boolean): any {
        if (fp.valtype) {
            if (fp.array) {
                let arr = new Array();
                if (val) {
                    if (typeof(fp.valtype) == "string") {
                        if (!(val instanceof Array)) {
                            // 对于array，约定用，来分割
                            val = val.split(",");
                        }
                        if (fp.valtype == string_t) {
                            val.forEach((e: any) => {
                                arr.push(e ? e.toString() : null);
                            });
                        }
                        else if (fp.valtype == integer_t) {
                            val.forEach((e: any) => {
                                arr.push(toInt(e));
                            });
                        }
                        else if (fp.valtype == double_t) {
                            val.forEach((e: any) => {
                                arr.push(toFloat(e));
                            });
                        }
                        else if (fp.valtype == boolean_t) {
                            val.forEach((e: any) => {
                                arr.push(!!e);
                            });
                        }
                    }
                    else {
                        if (typeof val == "string")
                            val = toJsonObject(val);
                        if (val && val instanceof Array) {
                            let clz: any = fp.valtype;
                            val.forEach((e: any) => {
                                let t = new clz();
                                this.fill(t, e, input, output);
                                arr.push(t);
                            });
                        }
                        else {
                            logger.log("Array遇到了错误的数据 " + val);
                        }
                    }
                }
                return arr;
            }
            else if (fp.map) {
                let map = new Map();
                if (typeof(fp.valtype) == "string") {
                    if (fp.valtype == string_t) {
                        for (let ek in val) {
                            let ev = val[ek];
                            map.set(ek, ev ? ev.toString() : null);
                        }
                    }
                    else if (fp.valtype == integer_t) {
                        for (let ek in val) {
                            let ev = val[ek];
                            map.set(ek, toInt(ev));
                        }
                    }
                    else if (fp.valtype == double_t) {
                        for (let ek in val) {
                            let ev = val[ek];
                            map.set(ek, toFloat(ev));
                        }
                    }
                    else if (fp.valtype == boolean_t)
                        for (let ek in val) {
                            let ev = val[ek];
                            map.set(ek, !!ev);
                        }
                }
                else {
                    let clz: any = fp.valtype;
                    for (let ek in val) {
                        let ev = val[ek];
                        let t = new clz();
                        this.fill(t, ev, input, output);
                        map.set(ek, t);
                    }
                }
                return map;
            }
            else if (fp.multimap) {
                let mmap = new Multimap();
                if (typeof(fp.valtype) == "string") {
                    if (fp.valtype == string_t) {
                        for (let ek in val) {
                            let ev = val[ek];
                            mmap.set(ek, ArrayT.Convert(ev, e => asString(e)));
                        }
                    }
                    else if (fp.valtype == integer_t) {
                        for (let ek in val) {
                            let ev = val[ek];
                            for (let ek in val) {
                                let ev = val[ek];
                                mmap.set(ek, ArrayT.Convert(ev, e => toInt(e)));
                            }
                        }
                    }
                    else if (fp.valtype == double_t) {
                        for (let ek in val) {
                            let ev = val[ek];
                            for (let ek in val) {
                                let ev = val[ek];
                                mmap.set(ek, ArrayT.Convert(ev, e => toFloat(e)));
                            }
                        }
                    }
                    else if (fp.valtype == boolean_t) {
                        for (let ek in val) {
                            let ev = val[ek];
                            for (let ek in val) {
                                let ev = val[ek];
                                mmap.set(ek, ArrayT.Convert(ev, e => toBoolean(e)));
                            }
                        }
                    }
                }
                else {
                    let clz: any = fp.valtype;
                    for (let ek in val) {
                        let ev = val[ek];
                        for (let ek in val) {
                            let ev = val[ek];
                            mmap.set(ek, ArrayT.Convert(ev, e => {
                                let t = new clz();
                                this.fill(t, e, input, output);
                                return t;
                            }));
                        }
                    }
                }
                return mmap;
            }
            else if (fp.enum) {
                return toInt(val);
            }
            else {
                if (typeof fp.valtype != "string")
                    val = toJsonObject(val);
                if (fp.valtype == Object)
                    return val;
                let clz: any = fp.valtype;
                let t = new clz();
                this.fill(t, val, input, output);
                return t;
            }
        }
        else {
            if (fp.string)
                return asString(val);
            else if (fp.integer)
                return toInt(val);
            else if (fp.double)
                return toFloat(val);
            else if (fp.boolean)
                return toBoolean(val);
            else if (fp.enum)
                return toInt(val);
            else if (fp.json)
                return toJsonObject(val);
            else if (fp.file)
                return new UploadedFileHandle(val);
            else
                return val;
        }
    }

    // 将数据从参数集写入模型
    fill(mdl: any, params: any, input: boolean, output: boolean): void {
        let fps = mdl[FP_KEY];
        if (fps == null)
            return;
        for (let key in params) {
            let fp: FieldOption = fps[key];
            if (fp == null)
                continue;
            if (input && !fp.input)
                continue;
            if (output && !fp.output)
                continue;
            mdl[key] = this.decodeField(fp, params[key], input, output);
        }
    }
}
