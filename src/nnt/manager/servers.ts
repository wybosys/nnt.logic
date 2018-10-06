import {Node, NodeIsEnable} from "../config/config"
import {App} from "./app";
import {AbstractServer, IConsoleServer} from "../server/server";
import {IRouter} from "../core/router";
import {logger} from "../core/logger";
import {IRouterable} from "../server/routers";
import {static_cast} from "../core/core";
import {EmptyTransaction, Transaction} from "../server/transaction";
import {STATUS} from "../core/models";
import {SyncArray, SyncMap, Class, IndexedObject} from "../core/kernel";
import {AcEntity} from "../acl/acl";

let servers = new Map<string, AbstractServer>();

export async function Start(cfg: Node[]): Promise<void> {
    if (cfg.length) {
        await SyncArray(cfg).forEach(async e => {
            if (!NodeIsEnable(e))
                return;
            let t: AbstractServer = App.shared().instanceEntry(e.entry);
            if (!t) {
                console.log(e.entry + " 实例化失败");
                return;
            }

            if (t.config(e)) {
                servers.set(t.id, t);
                // 启动对应的服务
                await t.start();
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
    await SyncMap(servers).forEach(async e => {
        await e.stop();
        return true;
    });
    servers.clear();
}

// 直接注册router到server
export function RegisterRouter(srvid: string, obj: IRouter) {
    let srv = servers.get(srvid);
    if (!srv) {
        logger.fatal("没有找到注册Router时使用的服务器 {{=it.id}}", {id: srvid});
        return;
    }
    let srvR = static_cast<IRouterable>(srv);
    if (!srvR.routers) {
        logger.fatal("该服务器 {{=it.id}} 不支持注册Router", {id: srvid});
        return;
    }
    srvR.routers.register(obj);
}

// 查找srv上面的router
export function FindRouter(srvid: string, action: string): IRouter {
    let srv = servers.get(srvid);
    if (!srv) {
        logger.fatal("没有找到注册Router时使用的服务器 {{=it.id}}", {id: srvid});
        return null;
    }
    let srvR = static_cast<IRouterable>(srv);
    if (!srvR.routers) {
        logger.fatal("该服务器 {{=it.id}} 不支持注册Router", {id: srvid});
        return null;
    }
    let ap = action.split(".");
    return srvR.routers.find(ap[0]);
}

// 查找服务
export function Find<T>(srvid: string, clz?: Class<T>): AbstractServer {
    let r = servers.get(srvid);
    if (!r)
        return r;
    if (clz)
        return r instanceof clz ? r : null;
    return r;
}

// 直接在控制台调用api
function ImplCall(srvid: string, action: string, params: IndexedObject, cb: (trans: Transaction) => void, ac?: AcEntity) {
    let srv = static_cast<IConsoleServer>(servers.get(srvid));
    if (!srv) {
        logger.fatal("没有找到该服务器 {{=it.id}}", {id: srvid});
        let et = new EmptyTransaction();
        et.status = STATUS.SERVER_NOT_FOUND;
        cb(et);
        return;
    }
    if (!srv.invoke) {
        logger.fatal("服务器 {{=it.id}} 没有实现IConsoleServer接口", {id: srvid});
        let et = new EmptyTransaction();
        et.status = STATUS.ARCHITECT_DISMATCH;
        cb(et);
        return;
    }
    params["action"] = action;
    params["__callback"] = (t: Transaction) => {
        if (t.status)
            logger.warn("调用 {{=it.sid}} 的动作 {{=it.act}} 返回 {{=it.err}}", {sid: srvid, act: action, err: t.status});
        cb(t);
    };
    srv.invoke(params, null, null, ac);
}

export function Call(srvid: string, action: string, params: IndexedObject, ac?: AcEntity): Promise<Transaction> {
    return new Promise(resolve => {
        ImplCall(srvid, action, params, trans => {
            resolve(trans);
        }, ac);
    });
}

export function ConsoleSubmit() {
    let self = <Transaction>this;
    let cb = self.params["__callback"];
    cb(self);
}

export function ConsoleOutput(type: string, obj: any) {
    let self = <Transaction>this;
    let cb = self.params["__callback"];
    self.payload = obj;
    cb(self);
}
