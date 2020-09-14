import {Node} from "../config/config"
import {ObjectExt} from "../core/sobject";

export abstract class AbstractDbms extends ObjectExt {
    // 唯一标记
    id: string;

    // 配置
    config(cfg: Node): boolean {
        this.id = cfg.id;
        return true;
    }

    // 打开连接
    abstract open(): Promise<void>;

    // 关闭连接
    abstract close(): Promise<void>;

    // 事务处理
    begin() {
    }

    complete() {
    }

    cancel() {
    }
}

// 返回到业务层处理游标，如果最后一个，则res == null，next == null，否则 next ！= null
export type IterateCursorProcess<T> = (res: T, next: (suc: boolean) => void, idx: number) => void;

// 数据库执行的情况
export interface DbExecuteStat {

    // 增加行数
    insert?: number;

    // 修改行数
    update?: number;

    // 删除行数
    remove?: number;
}