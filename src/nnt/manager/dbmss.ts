import {Node, NodeIsEnable} from "../config/config"
import {App} from "./app";
import {AbstractDbms, DbExecuteStat, IterateCursorProcess} from "../store/store";
import {RdbCmdType} from "../store/rdb";
import {NosqlCmdType} from "../store/kv";
import {SetInnerId} from "../store/proto";
import {ArrayT, IndexedObject, SyncArray, SyncMap} from "../core/kernel";
import {UpdateData} from "../core/proto";
import {Transaction, TransactionDef} from "./dbms/transaction";
import {Variant} from "../core/object";

let dbs = new Map<string, AbstractDbms>();

export async function Start(cfg: Node[]): Promise<void> {
    if (cfg.length) {
        await SyncArray(cfg).forEach(async e => {
            if (!NodeIsEnable(e))
                return;
            if (!e.entry)
                return;

            let t: AbstractDbms = App.shared().instanceEntry(e.entry);
            if (!t)
                return;

            if (t.config(e)) {
                await t.open();
                dbs.set(t.id, t);
            }
            else {
                console.log(t.id + "配置失败");
            }
        });
    }
    else {
        await Stop();
    }
}

export async function Stop(): Promise<void> {
    await SyncMap(dbs).forEach(async (v, k) => {
        await v.close();
        return true;
    });
    dbs.clear();
}

// 获得指定名称的数据库连接
export function Find(id: string): AbstractDbms {
    return dbs.get(id);
}

// 为了支持普通的sql查询和mongdb之类的object查询
type cmd_t = string | IndexedObject | Array<IndexedObject> | RdbCmdType | NosqlCmdType;

// 迭代查询的结果
export async function Iterate<T>(clz: TransactionDef<T>, cmd: cmd_t, process: IterateCursorProcess<T>) {
    let t = new Transaction(clz);
    t.nosqlproc = db => {
        db.iterate(t.table, <Object>cmd, (res: any, next: (suc: boolean) => void, idx) => {
            if (next == null) {
                process(null, null, idx);
            }
            else {
                let m = t.produce(res);
                SetInnerId(m, db.innerId(res));
                UpdateData(m);
                process(m, next, idx);
            }
        });
    };
    t.dbproc = db => {
        process(null, null, 0);
    };
    t.run();
}

// 聚集，一般返回的数据没有格式，所以只有id和cmd字段
export async function Aggregate<T>(clz: TransactionDef<T>, cmd: cmd_t, process?: IterateCursorProcess<IndexedObject>): Promise<IndexedObject[]> {
    let t = new Transaction<T, IndexedObject[]>(clz);
    t.nosqlproc = db => {
        if (process) {
            db.aggregate(t.table, <NosqlCmdType>cmd, null, process);
        }
        else {
            db.aggregate(t.table, <NosqlCmdType>cmd, res => {
                t.resolve(res);
            }, null);
        }
    };
    return t.run();
}

// 聚集并直接用对象返回
export async function AggregateQuery<T>(clz: TransactionDef<T>, cmd: cmd_t, process?: IterateCursorProcess<T>): Promise<T[]> {
    let t = new Transaction<T, T[]>(clz);
    t.nosqlproc = db => {
        if (process) {
            db.aggregate(t.table, <NosqlCmdType>cmd, null, (res, next, idx) => {
                if (!res) {
                    process(null, next, idx);
                }
                else {
                    let m = t.produce(res);
                    SetInnerId(m, db.innerId(res));
                    UpdateData(m);
                    process(m, next, idx);
                }
            });
        }
        else {
            db.aggregate(t.table, <NosqlCmdType>cmd, res => {
                if (res instanceof Array) {
                    let arr = ArrayT.Convert(res, e => {
                        let m = t.produce(e);
                        SetInnerId(m, db.innerId(e));
                        UpdateData(m);
                        return m;
                    });
                    t.resolve(arr);
                }
                else if (res) {
                    let m = t.produce(res);
                    SetInnerId(m, db.innerId(res));
                    UpdateData(m);
                    t.resolve([m]);
                }
                else {
                    t.resolve([]);
                }
            }, null);
        }
    };
    return t.run();
}

// 直接获得数据
export async function Value<T>(clz: TransactionDef<T>, cmd: cmd_t): Promise<Variant> {
    let t = new Transaction<T, Variant>(clz);
    t.kvproc = db => {
        let key = t.table;
        if (typeof cmd == "object")
            key += "." + JSON.stringify(cmd);
        else
            key += "." + cmd;
        db.get(key, res => {
            if (res == null)
                t.resolve(null);
            else {
                t.resolve(res);
            }
        });
    };
    return t.run();
}

// 获得数据模型（和Value的区别是返回的结果为定义的对象）
export async function Get<T>(clz: TransactionDef<T>, cmd: cmd_t): Promise<T> {
    let t = new Transaction<T, T>(clz);
    t.kvproc = db => {
        let key = t.table;
        if (typeof cmd == "object")
            key += "." + JSON.stringify(cmd);
        else
            key += "." + cmd;
        db.get(key, res => {
            if (res == null)
                t.resolve(null);
            else {
                let m = t.produce(res.object);
                UpdateData(m);
                t.resolve(m);
            }
        });
    };
    return t.run();
}

// 修改数据
export async function Set<T>(clz: TransactionDef<T>, cmd: cmd_t, obj: IndexedObject): Promise<boolean> {
    let t = new Transaction<T, boolean>(clz);
    t.kvproc = db => {
        let key = t.table;
        if (typeof cmd == "object")
            key += "." + JSON.stringify(cmd);
        else
            key += "." + cmd;
        db.set(key, new Variant(obj), res => {
            if (!res)
                t.resolve(false);
            else {
                t.resolve(true);
            }
        });
    };
    return t.run();
}

// 更新并修改
export async function Change<T>(clz: TransactionDef<T>, cmd: cmd_t, obj: IndexedObject): Promise<T> {
    let t = new Transaction<T, T>(clz);
    t.kvproc = db => {
        let key = t.table;
        if (typeof cmd == "object")
            key += "." + JSON.stringify(cmd);
        else
            key += "." + cmd;
        db.getset(key, new Variant(obj), res => {
            if (res == null)
                t.resolve(null);
            else {
                let m = t.produce(res.object);
                UpdateData(m);
                t.resolve(m);
            }
        });
    };
    return t.run();
}

export async function Count<T>(clz: TransactionDef<T>, cmd: cmd_t): Promise<number> {
    let t = new Transaction<T, number>(clz);
    t.nosqlproc = db => {
        db.count(t.table, <Object>cmd, cnt => {
            t.resolve(cnt);
        });
    };
    return t.run();
}

// 获得一组数据
export async function Query<T>(clz: TransactionDef<T>, cmd: cmd_t, limit?: number): Promise<T[]> {
    let t = new Transaction<T, T[]>(clz);
    t.rdbproc = db => {
        let q: RdbCmdType;
        if (cmd instanceof Array)
            q = [<string>cmd[0], cmd[1]];
        else
            q = [<string>cmd, null];
        db.query(q, res => {
            if (res == null)
                t.resolve([]);
            else {
                let rcds = new Array();
                res.forEach((e: any) => {
                    let m = t.produce(e);
                    UpdateData(m);
                    rcds.push(m);
                });
                t.resolve(rcds);
            }
        });
    };
    t.nosqlproc = db => {
        db.query(t.table, <Object>cmd, limit, t, res => {
            if (res == null)
                t.resolve([]);
            else {
                let rcds = new Array();
                res.forEach((e: any) => {
                    let m = t.produce(e);
                    // 使用db的decode函数重建模型, core和db中的Decode遵循的规则是完全不一样的
                    SetInnerId(m, db.innerId(e));
                    UpdateData(m);
                    rcds.push(m);
                });
                t.resolve(rcds);
            }
        });
    };
    return t.run();
}

// id 的定义格式为 <dbid> . <其他，nosql的时候为collection的名称, kv的时候为key>
// 获得一个
export async function QueryOne<T>(clz: TransactionDef<T>, cmd: cmd_t): Promise<T> {
    let t = new Transaction<T, T>(clz);
    t.rdbproc = db => {
        let q: RdbCmdType;
        if (cmd instanceof Array)
            q = [<string>cmd[0], cmd[1]];
        else
            q = [<string>cmd, null];
        db.query(q, res => {
            if (res == null || !res.length)
                t.resolve(null);
            else if (res.length > 1)
                t.resolve(null); //获取一个，不能有多个返回的情况
            else {
                let m = t.produce(res[0]);
                UpdateData(m);
                t.resolve(m);
            }
        });
    };
    t.nosqlproc = db => {
        db.query(t.table, <Object>cmd, 1, t, res => {
            if (res == null || !res.length)
                t.resolve(null);
            else if (res.length > 1)
                t.resolve(null);
            else {
                // 使用db的decode函数重建模型, core和db中的Decode遵循的规则是完全不一样的
                let m = t.produce(res[0]);
                SetInnerId(m, db.innerId(res[0]));
                UpdateData(m);
                t.resolve(m);
            }
        });
    };
    return t.run();
}

// 插入数据
export async function Insert<T>(clz: TransactionDef<T>, cmd: cmd_t): Promise<T> {
    let t = new Transaction<T, T>(clz);
    t.rdbproc = db => {
        let q: RdbCmdType;
        if (cmd instanceof Array)
            q = [<string>cmd[0], cmd[1]];
        else
            q = [<string>cmd, null];
        db.query(q, res => {
            if (res == null || !res.length)
                t.resolve(null);
            else if (res.length > 1)
                t.resolve(null); //获取一个，不能有多个返回的情况
            else {
                let m = t.produce(res[0]);
                UpdateData(m);
                t.resolve(m);
            }
        });
    };
    t.nosqlproc = db => {
        db.insert(t.table, <NosqlCmdType>cmd, res => {
            if (res == null)
                t.resolve(null);
            else {
                let m = t.produce(res);
                SetInnerId(m, db.innerId(res));
                UpdateData(m);
                t.resolve(m);
            }
        });
    };
    return t.run();
}

// 修改
export async function Modify<T>(clz: TransactionDef<T>, cmd: cmd_t): Promise<DbExecuteStat> {
    let t = new Transaction<T, DbExecuteStat>(clz);
    t.nosqlproc = db => {
        db.modify(t.table, <NosqlCmdType>cmd, res => {
            t.resolve(res);
        });
    };
    return t.run();
}

export async function ModifyOne<T>(clz: TransactionDef<T>, iid: any, cmd: cmd_t): Promise<boolean> {
    let t = new Transaction<T, boolean>(clz);
    t.nosqlproc = db => {
        db.modifyone(t.table, iid, <NosqlCmdType>cmd, res => {
            t.resolve(res);
        });
    };
    return t.run();
}

// 更新
export async function Update<T>(clz: TransactionDef<T>, cmd: cmd_t): Promise<T[]> {
    let t = new Transaction<T, T[]>(clz);
    t.nosqlproc = db => {
        db.update(t.table, <NosqlCmdType>cmd, res => {
            if (res == null) {
                t.resolve([]);
            }
            else {
                let arr = ArrayT.Convert(res, e => {
                    let m = t.produce(e);
                    SetInnerId(m, db.innerId(e));
                    UpdateData(m);
                    return m;
                });
                t.resolve(arr);
            }
        });
    };
    return t.run();
}

export async function UpdateOne<T>(clz: TransactionDef<T>, iid: any, cmd: cmd_t): Promise<T> {
    let t = new Transaction<T, T>(clz);
    t.nosqlproc = db => {
        db.updateone(t.table, iid, <NosqlCmdType>cmd, res => {
            if (res == null) {
                t.resolve(null);
            }
            else {
                let m = t.produce(res);
                SetInnerId(m, db.innerId(res));
                UpdateData(m);
                t.resolve(m);
            }
        });
    };
    return t.run();
}

// 删除
export async function Delete<T>(clz: TransactionDef<T>, cmd: cmd_t): Promise<DbExecuteStat> {
    let t = new Transaction<T, DbExecuteStat>(clz);
    t.rdbproc = db => {
        let q: RdbCmdType;
        if (cmd instanceof Array)
            q = [<string>cmd[0], cmd[1]];
        else
            q = [<string>cmd, null];
        db.query(q, res => {
            t.resolve();
        });
    };
    t.nosqlproc = db => {
        db.remove(t.table, <NosqlCmdType>cmd, res => {
            t.resolve(res);
        });
    };
    t.kvproc = db => {
        let key = t.table;
        if (typeof cmd == "object")
            key += "." + JSON.stringify(cmd);
        else
            key += "." + cmd;
        db.del(key, res => {
            t.resolve(res);
        });
    };
    return t.run();
}

export async function DeleteOne<T>(clz: TransactionDef<T>, iid: any, cmd: cmd_t): Promise<boolean> {
    let t = new Transaction<T, boolean>(clz);
    t.rdbproc = db => {
        let q: RdbCmdType;
        if (cmd instanceof Array)
            q = [<string>cmd[0], cmd[1]];
        else
            q = [<string>cmd, null];
        db.query(q, res => {
            t.resolve();
        });
    };
    t.nosqlproc = db => {
        db.removeone(t.table, iid, <NosqlCmdType>cmd, res => {
            t.resolve(res);
        });
    };
    t.kvproc = db => {
        let key = t.table;
        if (typeof cmd == "object")
            key += "." + JSON.stringify(cmd);
        else
            key += "." + cmd;
        db.del(key, res => {
            t.resolve(res ? true : false);
        });
    };
    return t.run();
}

// 获得数据段的自增id
export async function AutoInc<T>(clz: TransactionDef<T>, key: string, delta = 1, time: number = null): Promise<number> {
    let t = new Transaction<T, number>(clz);
    t.nosqlproc = db => {
        // 此处 "." 不能修改
        if (time) {
            db.autoinc(t.table + "." + key + "." + time, delta, res => {
                t.resolve(res);
            });
        }
        else {
            db.autoinc(t.table + "." + key, delta, res => {
                t.resolve(res);
            });
        }
    };
    t.kvproc = db => {
        if (time) {
            db.autoinc(t.table + "." + key + "." + time, delta, res => {
                t.resolve(res);
            });
        }
        else {
            db.autoinc(t.table + "." + key, delta, res => {
                t.resolve(res);
            });
        }
    };
    return t.run();
}

// 增加
export async function Inc<T>(clz: TransactionDef<T>, key: string, delta: number = 1): Promise<number> {
    let t = new Transaction<T, number>(clz);
    t.kvproc = db => {
        db.inc(t.table + "." + key, delta, res => {
            t.resolve(res);
        });
    };
    t.nosqlproc = db => {
        db.inc(t.table + "." + key, delta, res => {
            t.resolve(res);
        });
    };
    return t.run();
}
