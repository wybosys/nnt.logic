import {AbstractServer} from "./server";
import {Node} from "../config/config";
import {logger} from "../core/logger";
import {IndexedObject} from "../core/kernel";
import {Find} from "../manager/servers";
import {Base, ModelError} from "../session/model";
import {Rest} from "../session/rest";
import {integer, json, output} from "../core/proto";
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
export function Call(srvidOrUrl: string, args?: IndexedObject, subpath?: string): Promise<IndexedObject> {
    return new Promise<IndexedObject>(resolve => {
        Fetch(srvidOrUrl, args, subpath).then(m => {
            resolve(m);
        }).catch(() => {
            resolve(null);
        });
    });
}

// Fetch 和 Call的区别是需要业务层自行处理失败（可以用来获得错误码)
export function Fetch(srvidOrUrl: string, args?: IndexedObject, subpath?: string): Promise<IndexedObject> {
    return new Promise<IndexedObject>((resolve, reject) => {
        let host: string;
        if (srvidOrUrl.indexOf('http') != -1) {
            // 普通的url
            host = srvidOrUrl;
        }
        else {
            // 配置的服务
            let srv = <Remote>Find(srvidOrUrl);
            if (!srv) {
                let msg = "没有找到服务 " + srvidOrUrl;
                logger.fatal(msg);
                reject(new ModelError(STATUS.FAILED, msg));
                return;
            }

            if (!(srv instanceof Remote)) {
                let msg = "服务类型错误 " + srvidOrUrl;
                logger.fatal(msg);
                reject(new ModelError(STATUS.FAILED, msg));
                return;
            }
            host = srv.host;
        }

        if (subpath)
            host += subpath;

        let m = new RpcModel();
        m.url = host;
        m.additionParams = args;
        Rest.Fetch(m).then(m => {
            resolve(m.data);
        }).catch(err => {
            reject(err);
        });
    });
}
