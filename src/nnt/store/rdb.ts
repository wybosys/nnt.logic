import {AbstractDbms} from "./store";
import {FieldOption} from "./proto";
import {KvObject, PodType} from "../core/kernel";
import {RecordObject} from "./kv";

export type RdbCmdType = [string, KvObject<PodType> | Array<PodType> | PodType];

export abstract class AbstractRdb extends AbstractDbms {

    abstract query(cmd: RdbCmdType, cb: (res: RecordObject) => void): void;

    // 比较字段定义和手写定义是否有变化
    abstract compareFieldDef(my: FieldOption, tgt: any): boolean;

}

export function FpToRelvDefType(fp: FieldOption): string {
    if (fp.string)
        return fp.key ? "char(128)" : "text";
    if (fp.integer)
        return "int";
    if (fp.double)
        return "double";
    if (fp.boolean)
        return "tinyint(1)";
    if (fp.json)
        return "json";
    return "json"; // 默认的是json数据，这样既可以吃掉大部分数据结构
}