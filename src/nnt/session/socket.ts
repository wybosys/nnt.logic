import {toJson, toJsonObject} from "../core/json";
import {logger} from "../core/logger";
import {kSignalClose, kSignalDataChanged, kSignalFailed, kSignalOpen} from "../core/signals";
import {FromArrayBuffer} from "../core/string";
import {AbstractSocketConnector, AbstractSocketSession} from "./session";
import WebSocket = require("ws");

// connect解析返回数据时必须实现的接口
export interface ISocketResponse {

    // model发送时标记自己的序号
    _cmid: number;

    // 静默
    quiet: boolean;
}


export class WebSocketConnector extends AbstractSocketConnector {

    open() {
        if (this._hdl)
            return;

        let hdl = new WebSocket(this.host);
        hdl.binaryType = "arraybuffer";
        hdl.onopen = e => {
            this._hdl = hdl;
            this.onOpen(e);
        };
        hdl.onclose = e => {
            this._hdl = null;
            this.onClose(e);
        };
        hdl.onmessage = e => {
            let data = this.parseData(<ArrayBuffer>e.data);
            this.onMessage(data, e);
        };
        hdl.onerror = e => {
            this._hdl = null;
            this.onError(e);
        };
    }

    close() {
        if (this._hdl == null)
            return;
        this._hdl.close();
        this._hdl = null;
    }

    isopened(): boolean {
        return this._hdl != null;
    }

    write(d: any) {
        let str = toJson(d);
        this._hdl.send(str);
    }

    watch(d: any, on: boolean) {
        logger.fatal("不支持监听操作");
    }

    protected parseData(data: ArrayBuffer): any {
        let str = FromArrayBuffer(data);
        return toJsonObject(str);
    }

    protected onOpen(e: WebSocket.OpenEvent) {
        this.signals.emit(kSignalOpen);
    }

    protected onClose(e: WebSocket.CloseEvent) {
        this.signals.emit(kSignalClose);
    }

    protected onMessage(data: any, e: WebSocket.MessageEvent) {
        this.signals.emit(kSignalDataChanged, data);
    }

    protected onError(e: WebSocket.ErrorEvent) {
        this.signals.emit(kSignalFailed);
    }

    private _hdl?: WebSocket;
    private _session: AbstractSocketSession;

    get session(): AbstractSocketSession {
        return this._session;
    }
}
