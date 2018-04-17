import {AbstractServer} from "./server";
import {Node} from "../config/config";
import {logger} from "../core/logger";
import {IndexedObject} from "../core/kernel";
import {Find} from "../manager/servers";
import {Base} from "../session/model";
import {RestSession} from "../session/rest";

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

    url: string;

    requestUrl(): string {
        return this.url;
    }
}

export function Call(srvid: string, args: IndexedObject): Promise<IndexedObject> {
    return new Promise<Base>(resolve => {
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

        let m = new RpcModel();
        m.url = srv.host;
        m.additionParams = args;
        RestSession.Get(m).then(m => {
            resolve(m.data);
        });
    });
}