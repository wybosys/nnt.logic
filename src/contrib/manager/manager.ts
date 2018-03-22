import {Rest} from "../../nnt/server/rest";
import {static_cast} from "../../nnt/core/core";
import {Insert, Query} from "../../nnt/manager/dbmss";
import {make_tuple} from "../../nnt/core/kernel";
import {RManager} from "./router/manager";
import {Node} from "../../nnt/config/config";
import {ApiCfg} from "./router/genapi";
import {ConfigCfg} from "./router/genconfig";
import {expand, RegisterScheme} from "../../nnt/core/url";
import {AcGroup} from "../../nnt/acl/group";
import {ADMIN_GID, USER_GID} from "./model/manager";
import {Transaction} from "../../nnt/server/transaction";
import {Trans} from "./trans";
import {DbCfg} from "./router/gendb";

interface ManagerCfg {

    // 绑定的数据库
    dbsrv: string;

    // 绑定得缓存数据库
    mcsrv: string;

    // 绑定得图床
    imgsrv: string;

    // 生成api需要的
    genapi: ApiCfg[];

    // 生成配表需要的
    genconfig: ConfigCfg[];

    // 数据对象
    gendb: DbCfg[];
}

export class Manager extends Rest {

    config(cfg: Node): boolean {
        if (!super.config(cfg))
            return false;
        let c = static_cast<ManagerCfg>(cfg);
        if (!c.dbsrv)
            return false;
        this.dbsrv = c.dbsrv;
        this.mcsrv = c.mcsrv;
        this.imgsrv = c.imgsrv;
        this.genapi = c.genapi;
        this.gencfg = c.genconfig;
        this.gendb = c.gendb;
        return true;
    }

    dbsrv: string;
    mcsrv: string;
    imgsrv: string;
    genapi: ApiCfg[];
    gencfg: ConfigCfg[];
    gendb: DbCfg[];

    private _svc = new RManager(this);

    async start(): Promise<void> {
        // 默认0号组为管理员
        Query(make_tuple(this.dbsrv, AcGroup), {id: ADMIN_GID}).then(g => {
            if (!g) {
                Insert(make_tuple(this.dbsrv, AcGroup), {id: ADMIN_GID, name: "root"});
            }
        });

        // 默认1号组为普通用户
        Query(make_tuple(this.dbsrv, AcGroup), {id: USER_GID}).then(g => {
            if (!g) {
                Insert(make_tuple(this.dbsrv, AcGroup), {id: USER_GID, name: "user"});
            }
        });

        this.routers.register(this._svc);
        await super.start();
    }

    async stop(): Promise<void> {
        this.routers.unregister(this._svc.action);
        await super.stop();
    }

    instanceTransaction(): Transaction {
        return new Trans();
    }
}

RegisterScheme("manager", body =>
    expand("~/src/contrib/manager/") + body
);
