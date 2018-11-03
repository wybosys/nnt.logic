import {AbstractNosql, InnerIdType, NosqlCmdType, RecordObject} from "./kv";
import {Node} from "../config/config";
import {logger} from "../core/logger";
import {DbExecuteStat, IterateCursorProcess} from "./store";
import {ArrayT, IndexedObject, ObjectT, toJson} from "../core/kernel";
import {Variant} from "../core/object";
import {static_cast} from "../core/core";
import {IsDebug} from "../manager/config";
import mongo = require("mongodb");
import {ITransaction} from "../manager/dbms/transaction";

let DEFAULT_PORT = 27017;

interface MongoRsCfg {
    name: string;
    server: string[];
}

interface MongoCfg {

    // 服务器地址
    host: string;

    // 数据库，默认同时也会有张同名的collection
    scheme: string;

    // 集群
    repl?: MongoRsCfg;

    // 授权
    user: string;
    password: string;
}

function logerr(err: Error, cmd: any) {
    logger.warn("mongo执行错误：" + toJson(cmd));
    logger.error(err);
}

export class KvMongo extends AbstractNosql {

    host: string;
    scheme: string;
    user: string;
    password: string;
    repl: MongoRsCfg;
    cluster: boolean;

    config(cfg: Node): boolean {
        super.config(cfg);
        let c = static_cast<MongoCfg>(cfg);
        if (!c.host && !c.repl)
            return false;
        if (c.host) {
            if (c.host.indexOf(":") == -1)
                this.host = c.host + ":" + DEFAULT_PORT;
            else
                this.host = c.host;
            this.cluster = false;
        }
        if (c.repl) {
            this.repl = c.repl;
            this.cluster = true;
        }
        this.scheme = c.scheme;
        this.user = c.user;
        this.password = c.password;
        return true;
    }

    protected _repl: mongo.ReplSet;
    protected _db: mongo.Db;
    protected _cli: mongo.MongoClient;

    async open(): Promise<void> {
        if (this.cluster)
            await this.doOpenCluster();
        else
            await this.doOpenAlone();
    }

    protected async doOpenCluster() {
        let url = "mongodb://";
        if (this.user)
            url += encodeURIComponent(this.user) + ":" + encodeURIComponent(this.password) + "@";
        url += this.repl.server.join(",") + "?replicaSet=" + this.repl.name;
        try {
            let opts: mongo.MongoClientOptions = {
                useNewUrlParser: true
            };
            this._cli = await mongo.MongoClient.connect(url, opts);
            this._db = this._cli.db(this.scheme);
            logger.info("连接 {{=it.id}}@mongo", {id: this.id});
        }
        catch (err) {
            logerr(err, url);
        }
    }

    protected async doOpenAlone() {
        let url = "mongodb://" + this.host;
        try {
            let opts: mongo.MongoClientOptions = {
                useNewUrlParser: true
            };
            if (this.user) {
                opts.auth = {
                    user: this.user,
                    password: this.password
                }
            }
            this._cli = await mongo.MongoClient.connect(url, opts);
            this._db = this._cli.db(this.scheme);
            logger.info("连接 {{=it.id}}@mongo", {id: this.id});
        }
        catch (err) {
            logerr(err, url);
        }
    }

    async close(): Promise<void> {
        if (this._cli) {
            this._cli.close(true);
            this._cli = null;
            this._db = null;
        }
    }

    get(key: string, cb: (res: Variant) => void) {
        let col = this._db.collection(this.scheme);
        col.findOne({key: key}, (err, res) => {
            if (err) {
                logerr(err, ["get", key]);
                cb(null);
            }
            else {
                cb(Variant.Unserialize(res));
            }
        });
    }

    set(key: string, val: Variant, cb: (res: boolean) => void) {
        let col = this._db.collection(this.scheme);
        col.findOneAndUpdate({key: key}, {$set: {val: val.serialize()}}, (err, res) => {
            if (err) {
                logerr(err, ["set", key, val]);
                cb(false);
            }
            else {
                cb(true);
            }
        });
    }

    getset(key: string, val: Variant, cb: (res: Variant) => void) {
        let col = this._db.collection(this.scheme);
        col.findOneAndUpdate({key: key}, {$set: {val: val.serialize()}}, (err, res) => {
            if (err) {
                logerr(err, ["getset", key, val]);
                cb(null);
            }
            else {
                cb(Variant.Unserialize(res.value ? res.value.val : new Variant(null)));
            }
        });
    }

    del(key: string, cb: (res: DbExecuteStat) => void) {
        let col = this._db.collection(this.scheme);
        col.deleteOne({key: key}, (err, res) => {
            if (err) {
                logerr(err, ["del", key]);
                cb(null);
            }
            else {
                cb({remove: 1});
            }
        });
    }

    innerId(rcd: IndexedObject): InnerIdType {
        return rcd._id;
    }

    count(page: string, cmd: NosqlCmdType, cb: (cnt: number) => void) {
        if (typeof cmd == "string") {
            // 传入了IID
            cmd = {_id: StrToObjectId(cmd)};
        }
        let col = this._db.collection(page);
        col.find(cmd).count().then(cnt => {
            cb(cnt);
        });
    }

    query(page: string, cmd: NosqlCmdType, limit: number, t: ITransaction, cb: (res: RecordObject[]) => void) {
        if (typeof cmd == "string") {
            // 传入了IID
            cmd = {_id: StrToObjectId(cmd)};
        }

        let opts: mongo.FindOneOptions = {};

        // 根据模型减少查询返回的数据列数
        let cols = t.columns();
        if (cols) {
            let proj: IndexedObject = {};
            cols.forEach(col => {
                proj[col] = 1;
            });
            opts.projection = proj;
        }

        let col = this._db.collection(page);
        if (limit == 1) {
            col.findOne(cmd, opts, (err, res) => {
                if (err) {
                    logerr(err, ["query", cmd]);
                    cb(null);
                }
                else if (res) {
                    cb([res]);
                }
                else {
                    cb(null);
                }
            });
        }
        else {
            let cursor = col.find(cmd, opts);
            if (limit > 1)
                cursor.limit(limit);
            cursor.toArray((err, rcds) => {
                if (err) {
                    logerr(err, ["query", cmd]);
                    cb(null);
                }
                else {
                    cb(rcds);
                }
            });
        }
    }

    aggregate(page: string, cmd: NosqlCmdType, cb: (res: IndexedObject[]) => void, process: IterateCursorProcess<IndexedObject>) {
        let col = this._db.collection(page);
        let pipes: Object[];
        if (cmd instanceof Array)
            pipes = cmd;
        else if ('$group' in cmd ||
            '$match' in cmd ||
            "$project" in cmd ||
            "$sort" in cmd ||
            "$limit" in cmd ||
            "$project" in cmd
        ) {
            pipes = [];
            for (let k in cmd) {
                let t: IndexedObject = {};
                t[k] = cmd[k];
                pipes.push(t);
            }
        }
        else
            pipes = [cmd];
        if (cb) {
            col.aggregate(pipes, (err, cursor) => {
                if (err) {
                    logerr(err, ["aggregate", page, cmd]);
                    cb(null);
                }
                else {
                    cursor.toArray((err, res) => {
                        if (err) {
                            logerr(err, ["aggregate", page, cmd]);
                            cb(null);
                        }
                        else {
                            cb(res);
                        }
                    });
                }
            });
        }
        else {
            let cursor = col.aggregate(pipes, {cursor: {batchSize: 100}});
            IterateCursor(new AggregationCursor(cursor), process, () => {
            });
        }
    }

    iterate(page: string, cmd: NosqlCmdType, process: IterateCursorProcess<IndexedObject>) {
        let col = this._db.collection(page);
        let cursor = col.find(cmd);
        IterateCursor(cursor, process, () => {
        });
    }

    insert(page: string, cmd: NosqlCmdType, cb: (res: RecordObject) => void) {
        let obj = <any>cmd;
        let col = this._db.collection(page);
        col.insertOne(obj, (err, res) => {
            if (err) {
                logerr(err, ["insert", page, cmd]);
                cb(null);
            }
            else {
                cb(res.ops[0]);
            }
        });
    }

    modify(page: string, cmd: NosqlCmdType, cb: (res: DbExecuteStat) => void) {
        let match: any, modify: any, opt: any;
        if (cmd instanceof Array) {
            match = cmd[0];
            modify = cmd[1];
            opt = cmd[2];
        }
        else {
            let err = new Error("当没有输入iid时，cmd的查询必须为一个数组");
            logerr(err, ["modify", cmd]);
            cb(null);
            return;
        }

        // 如果match中包含$id，则认为是目标查询ObjectId
        if (ObjectT.HasKey(match, "$id")) {
            match["_id"] = StrToObjectId(match["$id"]);
            delete match["$id"];
        }

        let col = this._db.collection(page);
        if (opt) {
            col.updateMany(match, modify, opt, (err, res) => {
                if (err) {
                    logerr(err, ["modify", cmd]);
                    cb(null);
                }
                else {
                    cb({
                        insert: res.upsertedCount,
                        update: res.modifiedCount
                    });
                }
            });
        }
        else {
            col.updateMany(match, modify, opt, (err, res) => {
                if (err) {
                    logerr(err, ["modify", cmd]);
                    cb(null);
                }
                else {
                    cb({
                        insert: res.upsertedCount,
                        update: res.modifiedCount
                    });
                }
            });
        }
    }

    modifyone(page: string, iid: InnerIdType, cmd: NosqlCmdType, cb: (res: DbExecuteStat) => void) {
        let match: any, modify: any, opt: any;
        if (iid) {
            if (typeof(iid) == "string")
                iid = StrToObjectId(iid);
            if (iid instanceof Array)
                match = {_id: {$in: iid}};
            else
                match = {_id: iid};
            if (cmd instanceof Array) {
                modify = cmd[0];
                opt = cmd[1];
            }
            else {
                modify = cmd;
            }
        }
        else {
            if (cmd instanceof Array) {
                match = cmd[0];
                modify = cmd[1];
                opt = cmd[2];
            }
            else {
                let err = new Error("当没有输入iid时，cmd的查询必须为一个数组");
                logerr(err, ["modifyone", iid, cmd]);
                cb(null);
                return;
            }
        }

        // 如果match中包含$id，则认为是目标查询ObjectId
        if (ObjectT.HasKey(match, "$id")) {
            match["_id"] = StrToObjectId(match["$id"]);
            delete match["$id"];
        }

        let col = this._db.collection(page);
        if (opt) {
            col.updateOne(match, modify, opt, (err, res) => {
                if (err) {
                    logerr(err, ["modifyone", iid, cmd]);
                    cb(null);
                }
                else {
                    cb({
                        insert: res.upsertedCount,
                        update: res.modifiedCount
                    });
                }
            });
        }
        else {
            col.updateOne(match, modify, opt, (err, res) => {
                if (err) {
                    logerr(err, ["modifyone", iid, cmd]);
                    cb(null);
                }
                else {
                    cb({
                        insert: res.upsertedCount,
                        update: res.modifiedCount
                    });
                }
            });
        }
    }

    // mongodb官方没有提供大批量findupdate的方法（毕竟可能更新大量数据，所以用此类方法时需要谨慎操作，而且需要重启服务后，维护用来保护的字段），采用保护字段，如果超过10s，则认为是之前的没有清，可以认为没有被锁
    update(page: string, cmd: NosqlCmdType, cb: (res: RecordObject[]) => void) {
        let match: any, modify: any, opt: any;
        if (cmd instanceof Array) {
            match = cmd[0];
            modify = cmd[1];
            opt = cmd[2];
        }
        else {
            let err = new Error("cmd的查询必须为一个数组");
            logerr(err, ["update", page, cmd]);
            cb(null);
            return;
        }

        // 如果match中包含$id，则认为是目标查询ObjectId
        if (ObjectT.HasKey(match, "$id")) {
            match["_id"] = StrToObjectId(match["$id"]);
            delete match["$id"];
        }

        let col = this._db.collection(page);
        let origin = false;
        if (opt && "returnOriginal" in opt)
            origin = !!opt["returnOriginal"];

        // 获取所有符合要求的id
        const rand = Math.random();

        // 锁掉符合要求的数据
        let locker_match = ObjectT.LightClone(match);
        locker_match["__ttl_findandupdatemany"] = {$ne: rand};
        col.updateMany(locker_match, {$set: {__ttl_findandupdatemany: rand}}, (err, stat) => {
            if (err) {
                logerr(err, ["update", page, cmd]);
                cb(null);
                return;
            }

            if (stat.matchedCount == 0) {
                cb(null);
                return;
            }

            // 获取到刚刚锁定的记录
            col.find({__ttl_findandupdatemany: rand},
                origin ? null : {projection: {_id: 1}}
            ).toArray((err, fnds) => {
                if (err) {
                    logerr(err, ["update", page, cmd]);
                    cb(null);
                    return;
                }

                if (!fnds || fnds.length == 0) {
                    // 高并发时可能会被其他改掉，所以会返回空
                    cb(null);
                    return;
                }

                // 使用bulk批量处理跟新
                let bulk = col.initializeUnorderedBulkOp();

                let upsert = false;
                if (opt && "upsert" in opt)
                    upsert = !!opt["upsert"];

                // 更新顺道解锁
                let locker_modify = ObjectT.LightClone(modify);
                locker_modify["$unset"] = {__ttl_findandupdatemany: ""};

                fnds.forEach(e => {
                    let oper = bulk.find({_id: e["_id"]});
                    if (upsert)
                        oper.upsert();
                    oper.updateOne(locker_modify);
                });

                bulk.execute((err, stat) => {
                    if (err) {
                        logerr(err, ["update", page, cmd]);
                        cb(null);
                    }
                    else {
                        // 提取数据
                        if (origin) {
                            cb(fnds);
                        }
                        else {
                            let ids = ArrayT.Convert(fnds, e => {
                                return e["_id"];
                            });
                            // 重新查询
                            col.find({_id: {$in: ids}}).toArray((err, res) => {
                                // 前后瞬间的事情，所以认为此处必定能成功
                                cb(res);
                            });
                        }
                    }
                });
            });
        });
    }

    updateone(page: string, iid: InnerIdType, cmd: NosqlCmdType, cb: (res: RecordObject) => void) {
        let match: any, modify: any, opt: any;
        if (iid) {
            if (typeof(iid) == "string")
                iid = StrToObjectId(iid);
            if (iid instanceof Array)
                match = {_id: {$in: iid}};
            else
                match = {_id: iid};
            if (cmd instanceof Array) {
                modify = cmd[0];
                opt = cmd[1];
            }
            else {
                modify = cmd;
            }
        }
        else {
            if (cmd instanceof Array) {
                match = cmd[0];
                modify = cmd[1];
                opt = cmd[2];
            }
            else {
                let err = new Error("当没有输入iid时，cmd的查询必须为一个数组");
                logerr(err, ["updateone", page, iid, cmd]);
                cb(err);
                return;
            }
        }

        // 如果match中包含$id，则认为是目标查询ObjectId
        if (ObjectT.HasKey(match, "$id")) {
            match["_id"] = StrToObjectId(match["$id"]);
            delete match["$id"];
        }

        let col = this._db.collection(page);
        if (opt) {
            if (!("returnOriginal" in opt))
                opt["returnOriginal"] = false;
            col.findOneAndUpdate(match, modify, opt, (err, res) => {
                if (err) {
                    logerr(err, ["updateone", page, iid, cmd]);
                    cb(null);
                }
                else {
                    if (res.value == null)
                        logger.warn("{{=it.name}} 没有更新数据, {{=it.page}} {{=it.iid}} {{=it.cmd}}", {
                            name: "updateone",
                            page: page,
                            iid: iid,
                            cmd: toJson(cmd)
                        });
                    cb(res.value);
                }
            });
        }
        else {
            col.findOneAndUpdate(match, modify, {returnOriginal: false}, (err, res) => {
                if (err) {
                    logerr(err, ["updateone", page, iid, cmd]);
                    cb(null);
                }
                else {
                    if (res.value == null)
                        logger.warn("{{=it.name}} 没有更新数据, {{=it.page}} {{=it.iid}} {{=it.cmd}}", {
                            name: "updateone",
                            page: page,
                            iid: iid,
                            cmd: toJson(cmd)
                        });
                    cb(res.value);
                }
            });
        }
    }

    remove(page: string, cmd: NosqlCmdType, cb: (res: DbExecuteStat) => void) {
        let match: any;
        if (cmd instanceof Array) {
            match = cmd[0];
        }
        else {
            match = cmd;
        }

        // 如果match中包含$id，则认为是目标查询ObjectId
        if (ObjectT.HasKey(match, "$id")) {
            match["_id"] = StrToObjectId(match["$id"]);
            delete match["$id"];
        }

        let col = this._db.collection(page);
        col.deleteMany(match, (err, res) => {
            if (err) {
                logerr(err, ["remove", page, cmd]);
                cb(null);
            }
            else {
                cb({
                    remove: res.deletedCount
                });
            }
        });
    }

    removeone(page: string, iid: InnerIdType, cmd: NosqlCmdType, cb: (res: boolean) => void) {
        let match: any;
        if (iid) {
            if (typeof(iid) == "string")
                iid = StrToObjectId(iid);
            match = {_id: iid};
        }
        else {
            if (cmd instanceof Array) {
                match = cmd[0];
            }
            else {
                match = cmd;
            }
        }

        // 如果match中包含$id，则认为是目标查询ObjectId
        if (ObjectT.HasKey(match, "$id")) {
            match["_id"] = StrToObjectId(match["$id"]);
            delete match["$id"];
        }

        let col = this._db.collection(page);
        col.deleteMany(match, (err, res) => {
            if (err) {
                logerr(err, ["removeone", page, iid, cmd]);
                cb(false);
            }
            else {
                cb(true);
            }
        });
    }

    autoinc(key: string, delta: number, cb: (id: number) => void) {
        // 使用一个临时的collection纪录每一个page的计数，page参数就变成 collection.field
        let ps = key.split(".");
        let keynm: string;
        if (ps.length == 2) {
            keynm = ps[0] + '.' + ps[1];
        }
        else if (ps.length == 3) {
            keynm = ps[1] + '.' + ps[2];
        }
        else {
            cb(null);
            return;
        }

        // 分配表
        this._db.collection("__autoinc");

        // 执行inc
        this._db.command({
            "findAndModify": "__autoinc",
            "query": {_id: keynm},
            "upsert": true,
            "new": true,
            "update": {
                $inc: {val: delta}
            }
        }, (err, res) => {
            cb(res.value.val);
        });
    }

    inc(key: string, delta: number, cb: (id: number) => void) {
        // 使用一个临时的collection纪录每一个page的计数，page参数就变成 collection.field
        let ps = key.split(".");
        let keynm: string;
        if (ps.length == 2) {
            keynm = ps[0] + '.' + ps[1];
        }
        else if (ps.length == 3) {
            keynm = ps[1] + '.' + ps[2];
        }
        else {
            cb(null);
            return;
        }

        // 分配表
        this._db.collection("__manfinc");

        // 执行inc
        this._db.command({
            "findAndModify": "__manfinc",
            "query": {_id: keynm},
            "upsert": true,
            "new": true,
            "update": {
                $inc: {val: delta}
            }
        }, (err, res) => {
            cb(res.value.val);
        });
    }

    findIndex(name: string, cb: (info: any) => void) {
        this._db.indexInformation(name, (err, res) => {
            if (err) {
                cb(null);
            } else {
                cb(res);
            }
        });
    }

    createIndex(name: string, cfg: string | IndexedObject, cb: (ret: any) => void) {
        this._db.createIndex(name, cfg, {
            background: true
        }, (err, res) => {
            if (err) {
                cb(null);
            } else {
                cb(res);
            }
        });
    }
}

function StrToObjectId(s: string): mongo.ObjectID {
    let r: mongo.ObjectID;
    try {
        r = new mongo.ObjectId(s);
    } catch (err) {
        if (IsDebug()) {
            //logger.error(err);
            logger.warn("mongo：输入了错误的ObjectID " + s);
        }
    }
    return r;
}

function IterateCursor(cursor: mongo.Cursor | AggregationCursor, process: IterateCursorProcess<any>, done: () => void) {
    cursor.hasNext().then(b => {
        if (!b) {
            process(null, null, 0);
            done();
            return;
        }

        DoIterateCursor(cursor, process, done, 0);
    });
}

function DoIterateCursor(cursor: mongo.Cursor | AggregationCursor, process: IterateCursorProcess<any>, done: () => void, idx: number) {
    cursor.next().then(res => {
        // 先判断一下是否已经到最后
        cursor.hasNext().then(b => {
            if (!b)
                done();
            // 执行该次数据回调，如果已经结束，则不处理suc
            process(res, suc => {
                if (b) {
                    // 没有结束，但是业务层断开处理
                    if (!suc) {
                        done();
                        return;
                    }

                    // 继续下一次
                    DoIterateCursor(cursor, process, done, ++idx);
                }
            }, idx);
        });
    });
}

class AggregationCursor {

    constructor(cursor: mongo.AggregationCursor) {
        this._cursor = cursor;
    }

    private _cursor: mongo.AggregationCursor;
    private _current: any;
    private _next: any;

    hasNext(): Promise<boolean> {
        return new Promise(resolve => {
            if (!this._current) {
                this._cursor.next().then(res => {
                    this._current = res ? res : {};
                    this._next = res;
                    resolve(this._next != null);
                });
            }
            else {
                resolve(this._next != null);
            }
        });
    }

    next(): Promise<any> {
        return new Promise(resolve => {
            let t = this._current;
            this._cursor.next().then(res => {
                this._current = res ? res : {};
                this._next = res;
                resolve(t);
            });
        });
    }
}
