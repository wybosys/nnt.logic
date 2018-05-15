// 通过xlsx生成服务端配表的功能

import {Node} from "../config/config";
import {AbstractServer} from "./server";
import {static_cast} from "../core/core";
import {logger} from "../core/logger";
import {GenConfig} from "../component/gendata";
import {expand} from "../core/url";

interface XlsxNode {

    // 保存的目录
    dir: string;

    // 输出的目录
    output: string;
}

export class XlsxConfig extends AbstractServer {

    config(cfg: Node): boolean {
        if (!super.config(cfg))
            return false;
        let c = static_cast<XlsxNode>(cfg);
        this.dir = c.dir;
        this.output = c.output;
        if (!this.dir || !this.output) {
            logger.warn("处理的目录不能为空");
            return false;
        }
        return true;
    }

    dir: string;
    output: string;

    async start() {
        logger.info("启动 {{=it.id}}@xlsxconfig", {id: this.id});

        GenConfig({
            in: expand(this.dir),
            server: expand(this.output),
            client: null
        });
    }

    async stop() {
    }
}