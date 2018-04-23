import {Node} from "../config/config"
import {parse as urlparse} from "url"
import {EmptyTransaction, Transaction, TransactionSubmitOption} from "./transaction";
import {FindRender} from "../render/render";
import {AbstractServer, IConsoleServer} from "./server";
import {RestService} from "./rest/service";
import {IRouterable, Routers} from "./routers";
import {logger} from "../core/logger";
import {ConsoleOutput, ConsoleSubmit} from "../manager/servers";
import {STATUS} from "../core/models";
import {AcEntity} from "../acl/acl";
import {Config} from "../manager/config";
import {expand} from "../core/url";
import {RespFile} from "./file";
import {IndexedObject, nonnull1st, ObjectT} from "../core/kernel";
import {App} from "../manager/app";
import {IApiServer} from "./apiserver";
import {ParseContentToParams} from "./rest/params";
import {DateTime} from "../core/time";
import {Stream} from "../core/object";
import http = require("http");
import https = require("https");
import spdy = require("spdy");
import fs = require("fs");
import formidable = require("formidable");

export interface RestResponseData {
    contentType: string;
    content: string;
}

interface RestNode extends Node {
    // 服务器端口配置
    listen: string;
    port: number;

    // 安全设置
    https?: boolean;

    // http2 支持
    http2?: boolean;

    // 图片服务器的id，Rest服务如果需要管理图片，则必须配置此参数指向图片服务器的id，如果该图片服务器是其他服务器的代理，则也是会有一个id
    imgsrv?: string;

    // 媒体服务器
    mediasrv?: string;

    // 通过配置加载的路由器
    router?: string[] | IndexedObject; // router的列表或者 router:config 的对象
}

interface TransactionPayload {
    req: http.ServerRequest;
    rsp: http.ServerResponse;
}

function TransactionSubmit(opt?: TransactionSubmitOption) {
    let self = <Transaction>this;
    let pl: TransactionPayload = self.payload;
    let r = FindRender(self.params["render"]);
    let ct: IndexedObject = {"Content-Type": (opt && opt.type) ? opt.type : r.type};
    pl.rsp.writeHead(200, ct);
    pl.rsp.end(r.render(self, opt));
}

function TransactionOutput(type: string, obj: any) {
    let self = <Transaction>this;
    let pl: TransactionPayload = self.payload;
    let ct: IndexedObject = {"Content-Type": type};
    if (self.gzip)
        ct["Content-Encoding"] = "gzip";
    if (obj instanceof RespFile) {
        ct["Content-Length"] = obj.length;
        if (obj.cachable) {
            // 只有文件对象才可以增加过期控制
            if (pl.req.headers["if-modified-since"]) {
                // 判断下请求的文件有没有改变
                if (obj.stat.mtime.toUTCString() == pl.req.headers["if-modified-since"]) {
                    pl.rsp.writeHead(304, "Not Modified");
                    pl.rsp.end();
                    return;
                }
            }
            ct["Expires"] = obj.expire.toUTCString();
            ct["Cache-Control"] = "max-age=" + DateTime.WEEK;
            ct["Last-Modified"] = obj.stat.mtime.toUTCString();
        }
        // 如果是提供下载
        if (obj.download) {
            pl.rsp.setHeader('Accept-Ranges', 'bytes');
            pl.rsp.setHeader('Accept-Length', obj.length);
            pl.rsp.setHeader('Content-Disposition', 'attachment; filename=' + obj.file);
            pl.rsp.setHeader('Content-Description', "File Transfer");
            pl.rsp.setHeader('Content-Transfer-Encoding', 'binary');
        }
        pl.rsp.writeHead(200, ct);
        obj.readStream.pipe(pl.rsp);
    }
    else if (obj instanceof Stream) {
        pl.rsp.writeHead(200, ct);
        obj.pipe(pl.rsp);
    }
    else {
        pl.rsp.writeHead(200, ct);
        pl.rsp.end(obj);
    }
}

export class Rest extends AbstractServer implements IRouterable, IConsoleServer, IApiServer {

    constructor() {
        super();
        this._routers.register(new RestService());
    }

    // 用来构造请求事物的类型
    protected instanceTransaction(): Transaction {
        return new EmptyTransaction();
    }

    config(cfg: Node): boolean {
        if (!super.config(cfg))
            return false;
        let c = <RestNode>cfg;
        if (!c.port)
            return false;
        this.listen = null;
        if (c.listen && c.listen != "*")
            this.listen = c.listen;
        this.port = c.port;
        this.imgsrv = c.imgsrv;
        this.mediasrv = c.mediasrv;
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
        if (c.router) {
            if (c.router instanceof Array) {
                for (let i = 0; i < c.router.length; ++i) {
                    let e = c.router[i];
                    let router = App.shared().instanceEntry(e);
                    if (!router) {
                        logger.warn("没有找到该实例类型 {{=it.clz}}", {clz: e});
                        return false;
                    }
                    else {
                        this._routers.register(router);
                    }
                }
            }
            else {
                ObjectT.Foreach(c.router, (cfg, ent) => {
                    let router = App.shared().instanceEntry(ent);
                    if (!router || (router.config && !router.config(cfg))) {
                        logger.warn("没有找到该实例类型 {{=it.clz}}", {clz: ent});
                        return false;
                    }
                    else {
                        this._routers.register(router);
                    }
                });
            }
        }
        this.router = c.router;
        return true;
    }

    listen: string;
    port: number;
    https: boolean;
    http2: boolean;
    imgsrv: string;
    mediasrv: string;
    router: string[] | IndexedObject;

    protected _hdl: http.Server | https.Server;

    async start(): Promise<void> {
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
            this._hdl = https.createServer(cfg, (req, rsp) => {
                this.doWorker(req, rsp);
            });
        }
        else if (this.http2) {
            let cfg: IndexedObject = {
                pfx: fs.readFileSync(expand(Config.HTTPS_PFX)),
                spdy: {
                    protocols: ['h2', 'spdy/3.1', 'http/1.1'],
                    plain: false,
                    connection: {
                        windowSize: 1024 * 1024, // Server's window size
                        // **optional** if true - server will send 3.1 frames on 3.0 *plain* spdy
                        autoSpdy31: false
                    }
                }
            };
            if (Config.HTTPS_PASSWD)
                cfg["passphrase"] = Config.HTTPS_PASSWD;
            this._hdl = spdy.createServer((req, rsp) => {
                this.doWorker(req, rsp);
            });
        }
        else {
            this._hdl = http.createServer((req, rsp) => {
                this.doWorker(req, rsp);
            });
        }
        this._hdl.listen(this.port, this.listen ? this.listen : "0.0.0.0");
        logger.info("启动 {{=it.id}}@rest", {id: this.id});
        this.onStart();
    }

    protected doWorker(req: http.ServerRequest, rsp: http.ServerResponse) {
        // 打开跨域支持
        rsp.setHeader("Access-Control-Allow-Origin", "*");
        rsp.setHeader("Access-Control-Allow-Credentials", "true");
        rsp.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");

        // 直接对option进行成功响应
        if (req.method == "OPTIONS") {
            if (req.headers["access-control-request-headers"])
                rsp.setHeader("Access-Control-Allow-Headers", req.headers["access-control-request-headers"]);
            if (req.headers["access-control-request-method"] == "POST")
                rsp.setHeader("Content-Type", "multipart/form-data");
            rsp.writeHead(204);
            rsp.end();
            return;
        }

        // 处理url请求
        let url = urlparse(req.url, true);
        logger.log("{{=it.url}}", {url: req.url});

        // 需要支持以/分割和以&分割的两种url形式
        let params = <IndexedObject>url.query;
        // 为了支持第三方平台通过action同名传递动作
        if (url.pathname.indexOf("/$$/") == 0 ||
            url.pathname.indexOf("/action/") == 0) {
            let p = url.pathname.split("/");
            for (let i = 1, l = p.length; i < l;) {
                let k = p[i++];
                let v = p[i++];
                params[k] = v;
            }
        }

        // 如果是post请求，则处理一下form数据
        if (req.method == "POST") {
            // 如果是multipart-form得请求，则不适用于处理buffer
            let ct = req.headers["content-type"];
            if (!ct)
                ct = 'application/json';
            if (ct.indexOf("form") != -1) {
                let form = new formidable.IncomingForm();
                form.parse(req, (err: any, fields, files) => {
                    for (let key in fields)
                        params[key] = fields[key];
                    for (let key in files)
                        params[key] = files[key];
                    this.invoke(params, req, rsp);
                });
            }
            else {
                req.setEncoding("utf8");

                // 等所有参数恢复完成后，再调用业务逻辑
                let buf = "";
                req.on("data", chunk => {
                    buf += chunk;
                });
                req.on("end", () => {
                    ParseContentToParams(buf, ct).then(m => {
                        m.forEach((v, k) => {
                            params[k] = v;
                        });
                        this.invoke(params, req, rsp);
                    });
                });
            }
        }
        else {
            this.invoke(params, req, rsp);
        }
    }

    async stop(): Promise<void> {
        this.onStop();
        this._hdl.close();
        this._hdl = null;
    }

    protected _routers = new Routers();
    get routers(): Routers {
        return this._routers;
    }

    // 处理请求
    invoke(params: any, req: http.ServerRequest, rsp: http.ServerResponse, ac?: AcEntity) {
        let action = params["$$"] || params["action"];
        if (typeof action != "string") {
            rsp.writeHead(400);
            rsp.end();
            return;
        }

        let t: Transaction = this.instanceTransaction();
        try {
            t.ace = ac;
            t.server = this;
            t.action = action;
            t.params = params;

            // 从请求中保存下信息
            if (req) {
                let url = urlparse(req.url, true);
                if ("_agent" in params)
                    t.info.agent = params["_agent"];
                else
                    t.info.agent = req.headers['user-agent'] as string;
                t.info.host = req.headers['host'];
                t.info.origin = req.headers['origin'] as string;
                t.info.addr = req.connection.remoteAddress;
                t.info.referer = req.headers['referer'] as string;
                t.info.path = url.pathname;
            }

            this.onBeforeInvoke(t);
            this.doInvoke(t, params, req, rsp, ac);
            this.onAfterInvoke(t);
        }
        catch (err) {
            logger.exception(err);
            t.status = STATUS.EXCEPTION;
            t.submit();
        }
    }

    // 处理请求前
    protected onBeforeInvoke(trans: Transaction) {
    }

    protected onAfterInvoke(trans: Transaction) {
    }

    protected doInvoke(t: Transaction, params: any, req: http.ServerRequest, rsp: http.ServerResponse, ac?: AcEntity) {
        if (req && rsp) {
            t.payload = {req: req, rsp: rsp};
            t.implSubmit = TransactionSubmit;
            t.implOutput = TransactionOutput;
        }
        else {
            t.implSubmit = ConsoleSubmit;
            t.implOutput = ConsoleOutput;
        }

        if (params["_listen"] == "1") {
            this._routers.listen(t);
        }
        else if (params["_listen"] == "2") {
            this._routers.unlisten(t);
        }
        else {
            this._routers.process(t);
        }
    }
}
