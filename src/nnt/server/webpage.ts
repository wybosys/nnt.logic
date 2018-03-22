import {AbstractServer} from "./server";
import {Node} from "../config/config";
import {expand} from "../core/url";
import {logger} from "../core/logger";
import {Config} from "../manager/config";
import {IndexedObject, nonnull1st} from "../core/kernel";
import express = require("express");
import compression = require("compression");
import http = require("http");
import https = require("https");
import fs = require("fs");

interface WebPageNode extends Node {
    listen: string;
    port: number;
    root?: string;
    index?: string;
    https?: boolean;
    http2?: boolean;
}

export class WebPage extends AbstractServer {

    config(cfg: Node): boolean {
        if (!super.config(cfg))
            return false;
        let c = <WebPageNode>cfg;
        if (!c.port)
            return false;
        this.root = c.root;
        this.index = c.index;
        this.listen = c.listen;
        this.port = c.port;
        this.https = nonnull1st(false, c.https, Config.HTTPS);
        this.http2 = nonnull1st(false, c.http2, Config.HTTP2);
        if (this.https || this.http2) {
            if (Config.HTTPS_PFX) {
                // pass
            }
            else if (Config.HTTPS_KEY && Config.HTTPS_CERT) {
                // pass
            }
            else {
                logger.warn("没有配置https的证书");
                return false;
            }
        }
        return true;
    }

    listen: string;
    port: number;
    root: string;
    index: string;
    https: boolean;
    http2: boolean;

    protected _app: express.Express;
    protected _srv: http.Server | https.Server;

    async start(): Promise<void> {
        this._app = express();
        this._app.use(compression());

        // 业务层的主要处理函数
        this.main();

        if (this.https) {
            let cfg: IndexedObject = {};
            if (Config.HTTPS_PFX) {
                cfg["pfx"] = fs.readFileSync(expand(Config.HTTPS_PFX));
            }
            else {
                cfg["key"] = fs.readFileSync(expand(Config.HTTPS_KEY));
                cfg["cert"] = fs.readFileSync(expand(Config.HTTPS_CERT));
            }
            if (Config.HTTPS_PASSWD)
                cfg["passphrase"] = Config.HTTPS_PASSWD;
            this._srv = https.createServer(cfg, this._app);
        }
        else {
            this._srv = http.createServer(this._app);
        }
        this._srv.listen(this.port, this.listen ? this.listen : "0.0.0.0");
        logger.info("启动 {{=it.id}}@web", {id: this.id});
        this.onStart();
    }

    async stop(): Promise<void> {
        this.onStop();
        this._srv.close();
        this._srv = null;
        this._app = null;
    }

    main() {
        // 实现基本的root
        this._app.use(express.static(expand(this.root)));
    }

}