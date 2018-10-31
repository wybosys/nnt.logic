import {AbstractDbms} from "../../store/store";
import {AbstractRdb} from "../../store/rdb";
import {AbstractKv, AbstractNosql} from "../../store/kv";
import {Class, IsTuple, tuple} from "../../core/kernel";
import {Decode, GetFieldInfos, GetStoreInfo} from "../../store/proto";
import {logger} from "../../core/logger";
import {Find} from "../dbmss";

// 定义了数据库访问路径，[dbid].[table].[other] 例如 kv.users
export type StorePath = string;
export type RedirectClass<T> = Class<T>;

// 数据库事务定义为通过数据库模型来访问数据
// 提供数据库的配置：dbid代表数据库服务的id，clazz代表数据库orm
// 通过TransactionDef来支持如下几种访问方式
// Clazz(可以通过@table来提供dbid)
// Clazz和dbid来定义返回的类型和dbid
// Clazz和dbClazz来定义返回的类型和提供dbid的类型
// dbid和Clazz来定义（支持运行中修改db连接的对象）

type TransactionTupleDef<T> = tuple<Class<T>, StorePath> |
    tuple<Class<T>, RedirectClass<any>> |
    tuple<string, Class<T>>;

export type TransactionDef<T> = Class<T> | TransactionTupleDef<T>;

export interface ITransaction {

    // 获取当前模型的字段列表
    columns(): string[];
}

export class Transaction<T, R> implements ITransaction {

    constructor(def: TransactionDef<T>) {
        if (IsTuple(def)) {
            let d = <TransactionTupleDef<T>>def;
            if (typeof d[0] == "string") {
                let t = <tuple<string, Class<T>>>d;
                this.clazz = t[1];
                if (!this._parseClass(t[1]))
                    return;
                this.dbid = t[0];
            }
            else if (typeof d[1] == "string") {
                let t = <tuple<Class<T>, StorePath>>d;
                this.clazz = t[0];
                if (!this._parseStorePath(t[1]))
                    return;
            }
            else {
                let t = <tuple<Class<T>, RedirectClass<T>>>d;
                // class的方式
                this.clazz = t[0];
                if (!this._parseClass(t[1]))
                    return;
            }
        }
        else {
            this.clazz = <Class<T>>def;
            if (!this._parseClass(this.clazz))
                return;
        }

        let db = Find(this.dbid);
        if (db == null) {
            logger.fatal("没有找到 {{=it.id}} 对应的数据库", {id: this.dbid});
            return;
        }

        this._db = db;
        if (db instanceof AbstractRdb)
            this._rdb = db;
        else if (db instanceof AbstractNosql)
            this._nosql = db;
        else if (db instanceof AbstractKv)
            this._kv = db;
    }

    protected _parseStorePath(sp: string): boolean {
        let ps = sp.split(".");
        if (ps.length != 2)
            return false;
        this.dbid = ps[0];
        this.table = ps[1];
        return true;
    }

    protected _parseClass<T>(clz: Class<T>): boolean {
        let ti = GetStoreInfo(clz);
        if (!ti) {
            logger.fatal("{{=it.clz}} 不是有效的数据库模型", {clz: this.clazz["name"]});
            return false;
        }
        this.dbid = ti.id;
        this.table = ti.table;
        return true;
    }

    // 传入的类
    clazz: Class<T>;

    // 表名
    dbid: string;
    table: string;

    // 存储类的字段列表
    columns(): string[] {
        if (!this.clazz)
            return null;
        let fp = GetFieldInfos(this.clazz.prototype);
        return Object.keys(fp);
    }

    // 生成对象
    produce<R>(res: R): T {
        if (this.clazz) {
            let r = new this.clazz();
            Decode(r, res);
            return r;
        }
        return null;
    }

    // 数据库连接
    protected _db: AbstractDbms;
    protected _rdb: AbstractRdb;
    protected _nosql: AbstractNosql;
    protected _kv: AbstractKv;

    // 基于的promise对象
    resolve: (ret?: R) => void;

    // 针对不同数据库的实现
    dbproc: (db: AbstractDbms, t: Transaction<T, R>) => void = () => {
        this.resolve(null);
    };

    rdbproc: (db: AbstractRdb, t: Transaction<T, R>) => void;
    nosqlproc: (db: AbstractNosql, t: Transaction<T, R>) => void;
    kvproc: (db: AbstractKv, t: Transaction<T, R>) => void;

    run(): Promise<R> {
        return new Promise(resolve => {
                if (!this._db) {
                    resolve(null);
                    return;
                }
                this.resolve = (ret: R) => {
                    resolve(ret);
                    this.resolve = null;
                };
                try {
                    if (this._rdb)
                        this.rdbproc && this.rdbproc.call(this, this._rdb, this);
                    else if (this._nosql)
                        this.nosqlproc && this.nosqlproc.call(this, this._nosql, this);
                    else if (this._kv)
                        this.kvproc && this.kvproc.call(this, this._kv, this);
                    else if (this._db)
                        this.dbproc && this.dbproc.call(this, this._db, this);
                    else {
                        logger.warn("DBMS没有处理此次数据请求");
                        this.resolve(null);
                    }
                }
                catch (err) {
                    logger.exception(err);
                    this.resolve(null);
                }
            }
        );
    }
}
