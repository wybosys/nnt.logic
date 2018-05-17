import {AbstractDbms, DbExecuteStat, IterateCursorProcess} from "./store";
import {IndexedObject} from "../core/kernel";
import {Variant} from "../core/object";

export abstract class AbstractKv extends AbstractDbms {

    abstract get(key: string, cb: (res: Variant) => void): void;

    abstract set(key: string, val: Variant, cb: (res: boolean) => void): void;

    abstract getset(key: string, val: Variant, cb: (res: Variant) => void): void;

    abstract del(key: string, cb: (res: DbExecuteStat) => void): void;

    // kv数据库通常没有自增函数，所以需要各个业务类自己实现
    abstract autoinc(key: string, delta: number, cb: (id: number) => void): void;

    // 增加
    abstract inc(key: string, delta: number, cb: (id: number) => void): void;
}

export type NosqlCmdType = IndexedObject | IndexedObject[];
export type InnerIdType = any;
export type RecordObject = IndexedObject;

export abstract class AbstractNosql extends AbstractKv {

    // 获得记录的内部id
    abstract innerId(rcd: IndexedObject): InnerIdType;

    // @page 数据分片，mongo中叫collection
    // @cmd 查询指令
    abstract query(page: string, cmd: NosqlCmdType, limit: number, cb: (res: RecordObject[]) => void): void;

    // 统计数量
    abstract count(page: string, cmd: NosqlCmdType, cb: (cnt: number) => void): void;

    // 集合
    abstract aggregate(page: string, cmd: NosqlCmdType, cb: (res: IndexedObject[]) => void, process: IterateCursorProcess<IndexedObject>): void;

    // 迭代
    abstract iterate(page: string, cmd: NosqlCmdType, process: IterateCursorProcess<IndexedObject>): void;

    // 增加新纪录
    abstract insert(page: string, cmd: NosqlCmdType, cb: (res: RecordObject) => void): void;

    // 更新
    // @iid innerId 如果有的话，则直接通过iid更新，否则cmd中需要写明更新规则
    abstract update(page: string, iid: InnerIdType, cmd: NosqlCmdType, cb: (res: DbExecuteStat) => void): void;

    // 查找并更新
    abstract qupdate(page: string, iid: InnerIdType, cmd: NosqlCmdType, cb: (res: RecordObject) => void): void;

    // 删除
    abstract remove(page: string, iid: InnerIdType, cmd: NosqlCmdType, cb: (res: DbExecuteStat) => void): void;
}