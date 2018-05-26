import {AbstractServer} from "./server";
import {Node} from "../config/config";
import {logger} from "../core/logger";
import {IndexedObject} from "../core/kernel";
import {Find} from "../manager/servers";
import {Base} from "../session/model";
import {RestSession} from "../session/rest";
import {KEY_PERMISSIONID, Permissions} from "./devops/permissions";
import {integer, json, output} from "../core/proto";

interface RemoteConfig extends Node {
    // 远端服务器地址
    host: string;
}

export class Remote extends AbstractServer {

    config(cfg: Node): boolean {
        if (!super.config(cfg))
            return false;
        let c = <RemoteConfig>cfg;
        this.host = c.host;
        return true;
    }

    host: string;

    async start() {
        logger.info("连接 {{=it.id}}@remote", {id: this.id});
    }

    async stop() {
        // pass
    }
}

class RpcModel extends Base {

    // 访问的url
    url: string;

    @integer(1, [output])
    code: number;

    @json(2, [output])
    data: IndexedObject;

    requestUrl(): string {
        return this.url;
    }
}

export function Call(srvid: string, subpath: string, args: IndexedObject): Promise<IndexedObject>;
export function Call(srvid: string, args: IndexedObject): Promise<IndexedObject>;
export function Call(url: string): Promise<IndexedObject>;

export function Call(): Promise<IndexedObject> {
    let srvid: string;
    let subpath: string;
    let args: IndexedObject;
    switch (arguments.length) {
        case 1: {
            return new Promise<IndexedObject>(resolve => {
                // 直接调用
                args = [];

                // 如果是devops，则需要增加服务端授权id
                if (Permissions) {
                    args[KEY_PERMISSIONID] = Permissions.id;
                }

                let m = new RpcModel();
                m.url = arguments[0];
                m.additionParams = args;
                RestSession.Get(m).then(m => {
                    resolve(m ? m.data : null);
                });
            });
        }
            break;
        case 2: {
            srvid = arguments[0];
            args = arguments[1];
            subpath = "";
        }
            break;
        case 3: {
            srvid = arguments[0];
            subpath = arguments[1];
            args = arguments[2];
        }
            break;
    }
    return new Promise<IndexedObject>(resolve => {
        let srv = <Remote>Find(srvid);
        if (!srv) {
            logger.fatal("没有找到服务 " + srvid);
            resolve(null);
            return;
        }

        if (!(srv instanceof Remote)) {
            logger.fatal("服务类型错误 " + srvid);
            resolve(null);
            return;
        }

        // 如果是devops，则需要增加服务端授权id
        if (Permissions) {
            args[KEY_PERMISSIONID] = Permissions.id;
        }

        let m = new RpcModel();
        m.url = srv.host + subpath;
        m.additionParams = args;
        RestSession.Get(m).then(m => {
            resolve(m ? m.data : null);
        });
    });
}

// 比Call多出数据的后处理
export function Fetch(srvid: string, subpath: string, args: IndexedObject): Promise<IndexedObject>;
export function Fetch(srvid: string, args: IndexedObject): Promise<IndexedObject>;

export function Fetch(): Promise<IndexedObject> {
    let args = arguments;
    return new Promise<IndexedObject>(resolve => {
        Call.apply(this, args).then((resp: any) => {
            if (!resp || resp.code != 0) {
                resolve(null);
            }
            else {
                resolve(resp.data || resp.message);
            }
        });
    });
}
