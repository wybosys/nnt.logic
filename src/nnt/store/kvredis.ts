import {Node} from "../config/config";
import {AbstractKv} from "./kv";
import {logger} from "../core/logger";
import {GetStoreInfo, TableSetting} from "./proto";
import {IndexedObject, toInt} from "../core/kernel";
import {DbExecuteStat} from "./store";
import {Variant} from "../core/object";
import redis = require("redis");

export interface RedisNode extends Node {
    // 是否是集群模式
    cluster?: boolean;

    // redis的数据库索引，注意如果redis是cluster模式，则该参数无效
    dbid?: number;

    // 服务器地址
    host: string;

    // 密码
    password?: string;
}

const OPS_LIST = "list";
const OPS_SET = "set";

let OPS = [
    OPS_LIST,
    OPS_SET
];

export class KvRedis extends AbstractKv {

    dbid: number;
    host: string;
    port: number;
    passwd: string;

    config(cfg: Node): boolean {
        if (!super.config(cfg))
            return false;
        let c = <RedisNode>cfg;
        if (!c.host)
            return false;
        if (c.cluster)
            this.dbid = 0;
        else
            this.dbid = c.dbid ? c.dbid : 0;
        let arr = c.host.split(":");
        this.host = arr[0];
        this.port = arr.length == 2 ? parseInt(arr[1]) : 6379;
        this.passwd = c.password;
        return true;
    }

    protected _hdl: redis.RedisClient;

    open(): Promise<void> {
        return new Promise(resolve => {
            let opts: redis.ClientOpts = {
                host: this.host,
                port: this.port
            };
            if (this.passwd)
                opts.auth_pass = this.passwd;
            let hdl = redis.createClient(opts);
            hdl.on('error', (err: any) => {
                logger.info("启动失败 {{=it.id}}@redis", {id: this.id});
                logger.error(err);
            });
            hdl.on('ready', () => {
                logger.info("连接 {{=it.id}}@redis", {id: this.id});
                this._hdl = hdl;
                resolve();
            });
        });
    }

    async close(): Promise<void> {
        this._hdl.end(true);
        this._hdl = null;
    }

    select(dbid: number, cb?: (suc: boolean) => void) {
        this._hdl.select(dbid, (err, res) => {
            if (err) {
                logger.error(err);
                cb && cb(null);
                return;
            }
            cb && cb(true);
        });
    }

    get(key: string, cb: (res: Variant) => void) {
        this._hdl.get(key, (err: Error, res: any) => {
            if (err) {
                logger.error(err);
                cb(null);
                return;
            }
            cb(Variant.Unserialize(res));
        });
    }

    getraw(key: string, cb: (res: string) => void) {
        this._hdl.get(key, (err: Error, res: any) => {
            if (err) {
                logger.error(err);
                cb(null);
                return;
            }
            cb(res);
        });
    }

    set(key: string, val: Variant, cb: (res: boolean) => void) {
        // 判断val是不是store，如果是的话，提取key，分别生成对照
        // 否则直接设置字段
        let jsstr = val.serialize();
        if (val.object) {
            // 查找类型定义
            let mp = GetStoreInfo(val.object.constructor);
            this.doSet(key, jsstr, mp && mp.setting, cb);
        }
        else {
            this.doSet(key, jsstr, null, cb);
        }
    }

    setraw(key: string, val: string, cb: (res: boolean) => void) {
        this._hdl.set(key, val, (err, res) => {
            if (err) {
                logger.error(err);
                cb(false);
                return;
            }
            cb(true);
        });
    }

    protected doSet(key: string, val: string, ts: TableSetting, cb: (res: boolean) => void) {
        this._hdl.set(key, val, (err, res) => {
            if (err) {
                logger.error(err);
                cb(false);
                return;
            }

            let ttl = ts && ts.ttl;
            if (ttl)
                this._hdl.expire(key, ttl);

            cb(true);
        });
    }

    getset(key: string, val: Variant, cb: (res: Variant) => void) {
        let jsstr = val.serialize();
        if (val.object) {
            // 查找类型定义
            let mp = GetStoreInfo(val.object.constructor);
            this.doGetSet(key, jsstr, mp && mp.setting, cb);
        }
        else {
            this.doGetSet(key, jsstr, null, cb);
        }
    }

    getsetraw(key: string, val: string, cb: (pre: string) => void) {
        this._hdl.getset(key, val, (err, res) => {
            if (err) {
                logger.error(err);
                cb(null);
                return;
            }

            cb(res);
        });
    }

    protected doGetSet(key: string, val: string, ts: TableSetting, cb: (res: IndexedObject) => void) {
        this._hdl.getset(key, val, (err, res) => {
            if (err) {
                logger.error(err);
                cb(null);
                return;
            }

            let ttl = ts && ts.ttl;
            if (ttl)
                this._hdl.expire(key, ttl);

            cb(Variant.Unserialize(res));
        });
    }

    del(key: string, cb: (res: DbExecuteStat) => void) {
        this._hdl.del(key, (err, res) => {
            if (err) {
                logger.error(err);
                cb(null);
                return;
            }
            cb({remove: 1});
        });
    }

    autoinc(key: string, delta: number, cb: (id: number) => void) {
        if (delta == 1) {
            this._hdl.incr(key, (err, res: any) => {
                if (err) {
                    logger.error(err);
                    cb(null);
                    return;
                }
                cb(toInt(res[0]));
            });
        }
        else {
            this._hdl.incrby(key, delta, (err, res: any) => {
                if (err) {
                    logger.error(err);
                    cb(null);
                    return;
                }
                cb(toInt(res[0]));
            });
        }
    }

    inc(key: string, delta: number, cb: (id: number) => void) {
        if (delta > 0) {
            if (delta == 1) {
                this._hdl.incr(key, (err, res: any) => {
                    if (err) {
                        logger.error(err);
                        cb(null);
                        return;
                    }
                    cb(toInt(res[0]));
                });
            }
            else {
                this._hdl.incrby(key, delta, (err, res: any) => {
                    if (err) {
                        logger.error(err);
                        cb(null);
                        return;
                    }
                    cb(toInt(res[0]));
                });
            }
        }
        else {
            if (delta == -1) {
                this._hdl.decr(key, (err, res: any) => {
                    if (err) {
                        logger.error(err);
                        cb(null);
                        return;
                    }
                    cb(toInt(res[0]));
                });
            }
            else {
                this._hdl.decrby(key, -delta, (err, res: any) => {
                    if (err) {
                        logger.error(err);
                        cb(null);
                        return;
                    }
                    cb(toInt(res[0]));
                });
            }
        }
    }

    // 取得锁
    acquirelock(key: string, ttl: number, cb?: (suc: boolean) => void) {
        let pid = process.pid.toString();
        key = "locker." + key;
        this._hdl.setnx(key, pid, (err, res) => {
            if (err) {
                logger.error(err);
                cb && cb(false);
                return;
            }
            if (res != 1) {
                cb && cb(false);
                return;
            }
            if (ttl) {
                this._hdl.expire(key, ttl, (err, res) => {
                    if (err) {
                        logger.error(err);
                        cb && cb(false);
                        return;
                    }
                    cb && cb(true);
                });
            }
            else {
                cb && cb(true);
            }
        });
    }

    // 只能释放当前进程自己创建的锁
    // force = true, 则直接释放锁，不管是不是当前进程创建的
    releaselock(key: string, force: boolean = false, cb?: (suc: boolean) => void) {
        let pid = process.pid.toString();
        key = "locker." + key;
        this._hdl.get(key, (err, res) => {
            if (err) {
                logger.error(err);
                cb && cb(false);
                return;
            }
            if (force || pid == res) {
                this._hdl.del(key, (err, res) => {
                    if (err) {
                        logger.error(err);
                        cb && cb(false);
                        return;
                    }
                    cb && cb(true);
                });
            }
            else {
                cb && cb(false);
            }
        });
    }
}
