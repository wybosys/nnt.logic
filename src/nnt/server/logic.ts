import {Node} from "../config/config";
import {AbstractServer} from "./server";
import {logger} from "../core/logger";

interface LogicConfig extends Node {
    // 远端logic服务器地址
    host: string;
}

export class Logic extends AbstractServer {

    config(cfg: Node): boolean {
        if (!super.config(cfg))
            return false;
        let c = <LogicConfig>cfg;
        this.host = c.host;
        return true;
    }

    async start() {
        logger.info("连接 {{=it.id}}@remote", {id: this.id});
    }

    async stop() {
        // pass
    }

    host: string;
}
