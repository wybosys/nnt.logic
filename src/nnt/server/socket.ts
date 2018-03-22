import {AbstractServer, IConsoleServer} from "./server"
import {Node} from "../config/config"
import {IRouterable, Routers} from "./routers";
import {AcEntity} from "../acl/acl";
import {IndexedObject, nonnull1st, ObjectT, toJson} from "../core/kernel";
import {Config} from "../manager/config";
import {logger} from "../core/logger";
import {expand} from "../core/url";
import {IDecoder} from "./socket/decoder";
import {JsonDecoder} from "./socket/jsondecoder";
import {EmptyTransaction, Transaction} from "./transaction";
import {STATUS} from "../core/models";
import {ConsoleOutput, ConsoleSubmit} from "../manager/servers";
import {FindRender, IRender} from "../render/render";
import {RSocket} from "./socket/router";
import {ListenMode} from "./rest/listener";
import {CancelDelay, Delay} from "../core/time";
import ws = require("ws");
import http = require("http");
import https = require("https");
import fs = require("fs");

export type SocketOutputType = string | Buffer | ArrayBuffer;

// 超过时间后不登陆，断开连接
const TIMEOUT = 10;

interface WsNode extends Node {
    listen: string;
    port: number;
    wss?: boolean;
}

// method到transcation的处理器
let decoders = new Map<string, IDecoder>();

export function RegisterDecoder(url: string, obj: IDecoder) {
    decoders.set(url, obj);
}

export function FindDecoder(url: string): IDecoder {
    return decoders.get(url);
}

RegisterDecoder("/json", new JsonDecoder());

export class Connector {
    sessionId: string;
    clientId: string;

    // 输出的渲染器
    render: IRender;

    // 输出数据
    send(msg: SocketOutputType) {
        if (!this._hdl) {
            logger.warn("连接丢失，不能发送消息");
            return;
        }
        this._hdl.send(msg, err => {
            if (err)
                logger.error(err);
        });
    }

    close(retcode: number, msg?: string) {
        this._hdl.close(1000, toJson({code: retcode, message: msg})); // code必须是websocket支持的，1000代表普通关闭
        this._hdl = null;
    }

    get disconnecting(): boolean {
        return this._hdl == null;
    }

    private _hdl: ws;
}

function BindHdlToConnector(cnt: Connector, hdl: ws) {
    cnt["_hdl"] = hdl;
}

export class Socket extends AbstractServer implements IRouterable, IConsoleServer {

    constructor() {
        super();
        this.routers.register(new RSocket());
    }

    // 用来构造请求事物的类型
    protected instanceTransaction(): Transaction {
        return new EmptyTransaction();
    }

    protected instanceConnector(): Connector {
        return new Connector();
    }

    config(cfg: Node): boolean {
        if (!super.config(cfg))
            return false;
        let c = <WsNode>cfg;
        if (!c.port)
            return false;
        this.listen = null;
        if (c.listen && c.listen != "*")
            this.listen = c.listen;
        this.port = c.port;
        this.wss = nonnull1st(false, c.wss, Config.HTTPS);
        if (this.wss) {
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
    wss: boolean;

    protected _srv: http.Server | https.Server;
    protected _hdl: ws.Server;

    async start(): Promise<void> {
        if (this.wss) {
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
            this._srv = https.createServer(cfg, (req, rsp) => {
                rsp.writeHead(200);
                rsp.end();
            });
        }
        else {
            this._srv = http.createServer((req, rsp) => {
                rsp.writeHead(200);
                rsp.end();
            });
        }

        this._srv.listen(this.port, this.listen ? this.listen : "0.0.0.0");
        this._hdl = new ws.Server({server: this._srv});
        this.doWorker();
        logger.info("启动 {{=it.id}}@socket", {id: this.id});
        this.onStart();
    }

    protected doWorker() {
        this._hdl.on("connection", (io, req) => {
            let addr = req.connection.remoteAddress;
            let dec = FindDecoder(req.url);
            if (!dec) {
                logger.log("{{=it.addr}} 请求了错误的连接格式 {{=it.url}}", {addr: addr, url: req.url});
                io.close();
                return;
            }

            if (req.url)
                logger.log("{{=it.addr}} 连接服务器", {addr: addr});

            io.on("close", (code, reason) => {
                logger.log("{{=it.addr}} 断开连接", {addr: addr});

                let cnt = ObjectT.Get(io, IO_CONNECTOR);
                if (cnt) {
                    this.onConnectorUnavaliable(cnt);
                    BindHdlToConnector(cnt, null);
                    ObjectT.Set(io, IO_CONNECTOR, null);
                }
            });

            io.on("message", data => {
                // 解析请求
                let obj = dec.decode(data);
                // 如果不存在客户端模型id，则代表请求非法
                if (!obj["_cmid"]) {
                    logger.log("{{=it.addr}} 提交了非法数据", {addr: addr});
                    return;
                }
                // 转由invoke处理
                this.invoke(obj, req, io);
            });

            // 如果长期不登录，则断开连接
            let tmr = Delay(TIMEOUT, () => {
                logger.log("{{=it.addr}} 断开无效连接", {addr: addr});
                io.close();
            });
            ObjectT.Set(io, IO_TIMEOUT, tmr);
        });
    }

    async stop(): Promise<void> {
        this.onStop();
        this._srv.close();
        this._srv = null;
    }

    protected _routers = new Routers();
    get routers(): Routers {
        return this._routers;
    }

    invoke(params: any, req: http.IncomingMessage, rsp: ws, ac?: AcEntity) {
        let t: Transaction = this.instanceTransaction();
        try {
            t.ace = ac;
            t.server = this;
            t.action = params.action;
            t.params = params;

            this.doInvoke(t, params, req, rsp, ac);
        }
        catch (err) {
            logger.exception(err);
            t.status = STATUS.EXCEPTION;
            t.submit();
        }
    }

    protected doInvoke(t: Transaction, params: any, req: http.IncomingMessage, rsp: ws, ac?: AcEntity) {
        if (req && rsp) {
            t.payload = {req: req, rsp: rsp};
            t.implSubmit = TransactionSubmit;
            t.implOutput = TransactionOutput;
        }
        else {
            t.implSubmit = ConsoleSubmit;
            t.implOutput = ConsoleOutput;
        }

        // 如果发了sid，则坚持当前io的sid，不同则直接返回错误
        // 如果是第一次发sid，则添加到映射表中
        if (rsp) {
            // 如果通过Console来调用，rsp==null
            let sid = t.sessionId();
            let cursid = ObjectT.Get(rsp, IO_SESSIONKEY);
            if (cursid) {
                if (cursid != sid) {
                    if (params["_listen"] === ListenMode.UNLISTEN) {
                        this._routers.unlisten(t);
                    }
                    else {
                        t.status = STATUS.FAILED;
                        t.submit();
                    }
                    return;
                }
            }
            else {
                ObjectT.Set(rsp, IO_SESSIONKEY, sid);

                let cnt = this.instanceConnector();
                cnt.sessionId = sid;
                cnt.clientId = t.clientId();

                let dec = FindDecoder(req.url);
                cnt.render = dec.render;

                BindHdlToConnector(cnt, rsp);
                ObjectT.Set(rsp, IO_CONNECTOR, cnt);

                // 清除timeout
                let tmr = ObjectT.Get(rsp, IO_TIMEOUT);
                CancelDelay(tmr);
                ObjectT.Set(rsp, IO_TIMEOUT, null);

                this.onConnectorAvaliable(cnt);
            }
        }

        if (params["_listen"] === ListenMode.LISTEN) {
            this._routers.listen(t);
        }
        else if (params["_listen"] === ListenMode.UNLISTEN) {
            this._routers.unlisten(t);
        }
        else {
            this._routers.process(t);
        }
    }

    protected onConnectorAvaliable(connector: Connector) {
    }

    protected onConnectorUnavaliable(connector: Connector) {
    }
}

const IO_SESSIONKEY = "::nnt::socket::sessionId";
const IO_CONNECTOR = "::nnt::socket::connector";
const IO_TIMEOUT = "::nnt::socket::timeout";

// 服务端不去维护客户端连接列表，避免当运行在集群中客户端分散在不同地方连接，导致通过key查询客户端连接只能查询本机连接池的问题

interface TransactionPayload {
    req: http.IncomingMessage;
    rsp: ws;
}

function TransactionSubmit() {
    let self = <Transaction>this;
    let pl: TransactionPayload = self.payload;
    let r = FindRender(self.params["render"]);
    pl.rsp.send(r.render(self));
}

function TransactionOutput(type: string, obj: any) {
    let self = <Transaction>this;
    let pl: TransactionPayload = self.payload;
    let r = FindRender(self.params["render"]);
    pl.rsp.send(r.render(self));
}
