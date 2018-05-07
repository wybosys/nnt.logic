import {AbstractNosql, InnerIdType, NosqlCmdType, RecordObject} from "./kv";
import {Node} from "../config/config";
import {logger} from "../core/logger";
import {DbExecuteStat, IterateCursorProcess} from "./store";
import {IndexedObject, ObjectT, toJson} from "../core/kernel";
import {Variant} from "../core/object";
import {static_cast} from "../core/core";
import {IsDebug} from "../manager/config";
import mongo = require("mongodb");

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
            let opts: IndexedObject = {};
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
            let opts: IndexedObject = {};
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

    query(page: string, cmd: NosqlCmdType, limit: number, cb: (res: RecordObject[]) => void) {
        if (typeof cmd == "string") {
            // 传入了IID
            cmd = {_id: StrToObjectId(cmd)};
        }
        let col = this._db.collection(page);
        if (limit == 1) {
            col.findOne(cmd, (err, res) => {
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
            let cursor = col.find(cmd);
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
            "$limit" in cmd
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

    update(page: string, iid: InnerIdType, cmd: NosqlCmdType, cb: (res: DbExecuteStat) => void) {
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
                logerr(err, ["update", iid, cmd]);
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
            col.updateMany(match, modify, opt, (err, res) => {
                if (err) {
                    logerr(err, ["update", iid, cmd]);
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
                    logerr(err, ["update", iid, cmd]);
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

    qupdate(page: string, iid: InnerIdType, cmd: NosqlCmdType, cb: (res: RecordObject) => void) {
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
                logerr(err, ["qupdate", page, iid, cmd]);
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
                    logerr(err, ["qupdate", page, iid, cmd]);
                    cb(null);
                }
                else {
                    if (res.value == null)
                        logger.warn("{{=it.name}} 没有更新数据, {{=it.page}} {{=it.iid}} {{=it.cmd}}", {
                            name: "qupdate",
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
                    logerr(err, ["qupdate", page, iid, cmd]);
                    cb(null);
                }
                else {
                    if (res.value == null)
                        logger.warn("{{=it.name}} 没有更新数据, {{=it.page}} {{=it.iid}} {{=it.cmd}}", {
                            name: "qupdate",
                            page: page,
                            iid: iid,
                            cmd: toJson(cmd)
                        });
                    cb(res.value);
                }
            });
        }
    }

    remove(page: string, iid: InnerIdType, cmd: NosqlCmdType, cb: (res: DbExecuteStat) => void) {
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
                logerr(err, ["remove", page, iid, cmd]);
                cb(null);
            }
            else {
                cb({
                    remove: res.deletedCount
                });
            }
        });
    }

    autoinc(key: string, cb: (id: number) => void) {
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
            "query": {key: keynm},
            "upsert": true,
            "new": true,
            "update": {
                $inc: {val: 1}
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