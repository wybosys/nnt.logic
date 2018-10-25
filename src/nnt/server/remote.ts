import {AbstractServer} from "./server";
import {Node} from "../config/config";
import {logger} from "../core/logger";
import {IndexedObject} from "../core/kernel";
import {Find} from "../manager/servers";
import {Base, ModelError} from "../session/model";
import {Rest} from "../session/rest";
import {KEY_PERMISSIONID, KEY_SKIPPERMISSION, Permissions} from "./devops/permissions";
import {integer, json, output} from "../core/proto";
import {Config} from "../manager/config";
import {STATUS} from "../core/models";

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

    constructor() {
        super();
        this.submodel = true;
    }

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

// S2S调用API，成功返回data字段，失败返回null而不是抛出异常
export function Call(srvid: string, subpath: string, args: IndexedObject): Promise<IndexedObject>;
export function Call(srvid: string, args: IndexedObject): Promise<IndexedObject>;
export function Call(url: string): Promise<IndexedObject>;
export function Call(..._: any[]): Promise<IndexedObject> {
    return new Promise<IndexedObject>(resolve => {
        ImpFetch.apply(this, arguments).then((data: any) => {
            resolve(data);
        }).catch((err: ModelError) => {
            resolve(null);
        });
    });
}

// Fetch和Call的区别是需要业务层自行处理失败（可以用来获得错误码)
export function Fetch(srvid: string, subpath: string, args: IndexedObject): Promise<IndexedObject>;
export function Fetch(srvid: string, args: IndexedObject): Promise<IndexedObject>;
export function Fetch(url: string): Promise<IndexedObject>;
export function Fetch(..._: any[]): Promise<IndexedObject> {
    return ImpFetch.apply(this, arguments);
}

function ImpFetch(): Promise<IndexedObject> {
    let srvid: string;
    let subpath: string;
    let args: IndexedObject;
    switch (arguments.length) {
        case 1: {
            return new Promise<IndexedObject>((resolve, reject) => {
                // 直接调用
                args = [];

                // 如果是devops，则需要增加服务端授权id
                if (Permissions) {
                    args[KEY_PERMISSIONID] = Permissions.id;
                }
                else if (Config.LOCAL) {
                    args[KEY_SKIPPERMISSION] = 1;
                }

                let m = new RpcModel();
                m.url = arguments[0];
                m.additionParams = args;
                Rest.Get(m).then(m => {
                    resolve(m.data);
                }).catch(err => {
                    reject(err);
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
    return new Promise<IndexedObject>((resolve, reject) => {
        let srv = <Remote>Find(srvid);
        if (!srv) {
            let msg = "没有找到服务 " + srvid;
            logger.fatal(msg);
            reject(new ModelError(STATUS.FAILED, msg));
            return;
        }

        if (!(srv instanceof Remote)) {
            let msg = "服务类型错误 " + srvid;
            logger.fatal(msg);
            reject(new ModelError(STATUS.FAILED, msg));
            return;
        }

        // 如果是devops，则需要增加服务端授权id
        if (Permissions) {
            args[KEY_PERMISSIONID] = Permissions.id;
        }
        else if (Config.LOCAL) {
            args[KEY_SKIPPERMISSION] = 1;
        }

        let m = new RpcModel();
        m.url = srv.host + subpath;
        m.additionParams = args;
        Rest.Fetch(m).then(m => {
            resolve(m.data);
        }).catch(err => {
            reject(err);
        });
    });
}
