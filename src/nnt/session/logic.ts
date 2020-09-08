import {WebSocketConnector} from "./socket";
import {IndexedObject, toJsonObject} from "../core/kernel";
import {logger} from "../core/logger";
import {STATUS} from "../core/models";
import {
    kSignalClose,
    kSignalDataChanged,
    kSignalEnd,
    kSignalFailed,
    kSignalOpen,
    kSignalReopen,
    kSignalSucceed,
    Slot
} from "../core/signals";
import {CancelDelay, DateTime, Delay, Repeat, RepeatHandler} from "../core/time";
import {Base, ResponseData, SimpleModel} from "./model";
import {AbstractSocketConnector, AbstractSocketSession} from "./session";
import {App} from "../manager/app";
import {ListenMode} from "../server/rest/listener";
import {FindParser} from "../server/parser/parser";
import WebSocket = require("ws");

export class SocketConnector extends WebSocketConnector {

    // 自动重连
    autoReconnect = true;

    protected onClose(e: WebSocket.CloseEvent) {
        super.onClose(e);

        if (e && e.code == 4000) {
            // 服务端主动断开的链接，不能进行重连
            let reason = toJsonObject(e.reason);
            switch (reason.code) {
                case STATUS.SOCK_AUTH_TIMEOUT:
                    logger.log("没有登录，所以服务器主动断开了连接");
                    break;
                case STATUS.SOCK_WRONG_PORTOCOL:
                    logger.log("请求了错误的ws协议");
                    break;
                case STATUS.SOCK_SERVER_CLOSED:
                    logger.log("服务器关闭");
                    break;
                case STATUS.MULTIDEVICE:
                    logger.log("多端登录");
                    break;
            }
            return;
        } else {
            // 尝试重连
            if (this.autoReconnect) {
                this.signals.emit(kSignalReopen);
                Delay(1, () => {
                    this.doReconnect();
                });
            }
        }
    }

    protected onError(e: WebSocket.ErrorEvent) {
        super.onError(e);
        logger.log(e.message);

        if (this.autoReconnect) {
            Delay(1, () => {
                this.doReconnect();
            });
        }
    }

    protected doReconnect() {
        logger.log("尝试重新连接");
        this.open();
    }

    protected onMessage(data: any, e: WebSocket.MessageEvent) {
        // 需要对data进行处理，把服务端的IMPMessage结构数据提取出来
        super.onMessage({
            _cmid: data.d,
            code: data.s === undefined ? 0 : data.s,
            data: data.p,
            quiet: data.q
        }, e);
    }

    write(d: Base) {
        let params: IndexedObject = {
            _cmid: d.hashCode,
            _sid: this.session.SID,
            _cid: App.shared().uniqueId,
            _ts: DateTime.Now(),
            action: d.action,
        };
        let fields = d.requestParams();
        for (let k in fields) {
            params[k] = fields.fields[k];
        }
        super.write(params);
    }

    watch(d: Base, on: boolean) {
        let params: IndexedObject = {
            _cmid: d.hashCode,
            _sid: this.session.SID,
            _cid: App.shared().uniqueId,
            _ts: DateTime.Now(),
            _listen: on ? ListenMode.LISTEN : ListenMode.UNLISTEN,
            action: d.action,
        };
        let fields = d.requestParams();
        for (let k in fields) {
            params[k] = fields.fields[k];
        }
        super.write(params);
    }
}

/**
 * WebSocket的服务，和Rest不同，ws不能根据model的url来切换连接，所以不同的url需要实例不同的session
 */
export class WebSocketSession extends AbstractSocketSession {

    constructor(host?: string) {
        super();
        this.host = host;
    }

    // 解析器
    private _parser = FindParser('json');

    // 连接对象
    private _connector: AbstractSocketConnector;

    get connector(): AbstractSocketConnector {
        return this._connector;
    }

    /**
     * 不同的服务器对连接的要求是不一样的，所以需要实现对应的连接器，在open之前设置
     */
    set connector(cnt: AbstractSocketConnector) {
        if (this._connector == cnt)
            return;
        if (this._connector) {
            (<any>this._connector)._session = null;
        }
        this._connector = cnt;
        if (cnt) {
            (<any>cnt)._session = this;
            cnt.signals.connect(kSignalOpen, this.__cnt_open, this);
            cnt.signals.connect(kSignalClose, this.__cnt_disconnected, this);
            cnt.signals.connect(kSignalDataChanged, this.__cnt_gotmessage, this);
        }
    }

    /**
     * 可选的登录用户SID信息，会自动附加到请求数据中
     */
    SID: string;

    /**
     * 在服务器上监听该对象
     */
    watch(mdl: Base,
          cb?: (s?: Slot) => void, cbctx?: any) {
        if (this._listenings.has(mdl.hashCode))
            return;
        mdl.session = null;

        if (cbctx)
            mdl.attachref(cbctx);
        if (cb)
            mdl.signals.connect(kSignalSucceed, cb, cbctx);

        this._listenings.set(mdl.hashCode, mdl);
        if (this.connector && this.connector.isopened())
            this.connector.watch(mdl, true);
    }

    // 正在监听的对象集，用来当服务器回数据时激发，或者重新建立监听时使用
    private _listenings = new Map<number, Base>();

    unwatch(mdl: Base) {
        if (!this._listenings.has(mdl.hashCode))
            return;

        // 释放
        if (this.connector && this.connector.isopened())
            this.connector.watch(mdl, false);
        mdl.drop();

        // 从session中移除
        this._listenings.delete(mdl.hashCode);
    }

    // 正在等待类rest访问的模型，收到访问或超时后就会被移除
    private _fetchings = new Map<number, Base>();

    /** 获取一个数据
     * @param mdl 数据模型
     * @param cb, 成功后的回调
     * @param cbctx, 回调依赖的上下文
     * @param cbfail, 失败后的回调
     * @param cbend, 结束的回调（不区分成功、失败）
     */
    fetch(mdl: Base,
          cb?: (s?: Slot) => void, cbctx?: any,
          cbfail?: (s?: Slot) => void, cbend?: () => void) {
        if (!this.connector || !this.connector.isopened()) {
            if (cbfail)
                cbfail.call(cbctx);
            if (cbend)
                cbend.call(cbctx);
            return;
        }

        // 为了防止正在调用 api 时，接受信号的对象析构，保护一下
        if (cbctx)
            mdl.attachref(cbctx);

        if (cb)
            mdl.signals.connect(kSignalSucceed, cb, cbctx);
        if (cbfail)
            mdl.signals.connect(kSignalFailed, cbfail, cbctx);
        if (cbend)
            mdl.signals.connect(kSignalEnd, cbend, cbctx);

        this._fetchings.set(mdl.hashCode, mdl);
        mdl.session = this;
        this.connector.write(mdl);
    }

    /** 服务器的地址 */
    host: string;

    /** 打开连接 */
    open() {
        if (!this.connector) {
            logger.fatal("没有设置connector");
            return;
        }

        if (this.connector.isopened()) {
            logger.fatal('连接已经打开');
            return;
        }

        this.connector.host = this.host;
        this.connector.open();
    }

    is_connected() {
        return this.connector.isopened();
    }

    private __cnt_open() {
        logger.info('打开服务器 ' + this.host + ' 成功');

        // 初始化连接
        let m = new SimpleModel();
        m.action = "socket.init";
        this.fetch(m, () => {
            logger.log('连接服务器 ' + this.host + ' 成功');
            this.signals.emit(kSignalOpen);

            // 重新建立监听
            this._listenings.forEach(mdl => {
                this.connector.watch(mdl, true);
            });

            this._tmrPing = Repeat(30, () => {
                let m = new SimpleModel();
                m.action = "socket.ping";
                this.fetch(m);
            });
        });
    }

    private __cnt_disconnected() {
        logger.log('服务器 ' + this.host + ' 断开连接');
        this.signals.emit(kSignalClose);

        if (this._tmrPing) {
            CancelDelay(this._tmrPing);
            this._tmrPing = null;
        }
    }

    private _tmrPing: RepeatHandler;

    private __cnt_gotmessage(s: Slot) {
        let data: IndexedObject = s.data;
        let respndata: ResponseData = {
            code: data.code,
            type: "",
            body: {
                code: data.code,
                data: data.data
            },
            raw: ""
        };

        // 判断是否是fetch
        if (this._fetchings.has(data._cmid)) {
            // 解析对象
            let mdl = this._fetchings.get(data._cmid);
            // 后处理
            mdl.quiet = data.quiet;
            mdl.data = data.data;
            mdl.parseData(respndata, this._parser, null, null);
            this._fetchings.delete(data._cmid);
        }

        // 判断是否是watch请求
        if (this._listenings.has(data._cmid)) {
            let mdl = this._listenings.get(data._cmid);
            mdl.quiet = data.quiet;
            mdl.data = data.data;
            mdl.parseData(respndata, this._parser, null, null);
        }
    }
}
