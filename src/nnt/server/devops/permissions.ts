import {Hook, STARTED} from "../../manager/app";
import {Config} from "../../manager/config";
import {KvRedis, RedisNode} from "../../store/kvredis";
import {ArrayT, IndexedObject, toJsonObject} from "../../core/kernel";
import {logger} from "../../core/logger";
import fs = require("fs");
import mask = require("netmask");

class _Permissions {

    constructor() {
        // 连接devops数据库
        this._db = new KvRedis();
        this._db.config(<RedisNode>{
            id: "devops-redis",
            entry: "nnt.store.KvRedis",
            host: 'localhost:26379'
        });
        this._db.open().then(() => {
            this._db.select(REDIS_PERMISSIONIDS);
        });

        // 监听cfg中的id改变
        fs.watchFile('/work/run/permission.cfg', (cur, prev) => {
            let jsobj = toJsonObject(fs.readFileSync('/work/run/permission.cfg', "utf8"));
            this._id = jsobj['id'];
        });

        // 初始化配置
        this._allow = ArrayT.Convert(Config.ACCESS_ALLOW, e => {
            return new mask.Netmask(e);
        });

        this._deny = ArrayT.Convert(Config.ACCESS_DENY, e => {
            return new mask.Netmask(e);
        });
    }

    private _id: string;
    private _allow: mask.Netmask[];
    private _deny: mask.Netmask[];

    get id(): string {
        if (!this._id) {
            if (fs.existsSync('/work/run/permission.cfg')) {
                let jsobj = toJsonObject(fs.readFileSync('/work/run/permission.cfg', "utf8"));
                this._id = jsobj['id'];
            }
            else {
                logger.warn("没有获取到permissionid");
            }
        }
        return this._id;
    }

    locate(permid: string): Promise<IndexedObject> {
        return new Promise<IndexedObject>(resolve => {
            this._db.getraw(permid, res => {
                resolve(toJsonObject(res));
            });
        });
    }

    allowClient(clientip: string): boolean {
        if (this._allow.length) {
            let fnd = ArrayT.QueryObject(this._allow, e => {
                return e.contains(clientip);
            });
            if (!fnd)
                return false;
        }

        if (this._deny.length) {
            let fnd = ArrayT.QueryObject(this._deny, e => {
                return e.contains(clientip);
            });
            if (fnd)
                return false;
        }

        return true;
    }

    private _db: KvRedis;
}

export let Permissions: _Permissions;

Hook(STARTED, () => {
    if (Config.DEVOPS)
        Permissions = new _Permissions();
});

export const KEY_PERMISSIONID = "_permissionid";
export const KEY_SKIPPERMISSION = "_skippermission";
export const REDIS_PERMISSIONIDS = 17;
