import {Hook, STARTED} from "../../manager/app";
import {Config} from "../../manager/config";
import {KvRedis, RedisNode} from "../../store/kvredis";
import {IndexedObject} from "../../core/kernel";

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
    }

    locate(permid: string): Promise<IndexedObject> {
        return new Promise<IndexedObject>(resolve => {
            this._db.get(permid, res => {
                resolve(res ? res.toJsObj() : null);
            });
        });
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