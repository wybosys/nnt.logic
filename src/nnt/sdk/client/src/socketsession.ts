import {Base, CMap, IndexedObject, SocketMethod} from "./model";
import {ErrorCallBack, Session, SuccessCallback} from "./session";
import {CacheSession} from "./cachesession";
import {RetryTime, toJsonObject} from "./utils";
import {STATUS, StatusError} from "./status";

interface FetchingModel {
    model: Base;
    suc: SuccessCallback<any>;
    err: ErrorCallBack;
}

enum ListenMode {
    NONE = 0,
    LISTEN = 1,
    UNLINSTEN = 2,
}

class Connector {

    constructor(host: string, method: SocketMethod) {
        this._host = host;
        this._method = method;

        // 如果SID变化，则断开连接，等待使用新的SID重新连接
        Session.EVENT.addListener(Session.EVENT_SID_CHANGED, () => {
            if (this._hdl)
                this._hdl.close();
        });
    }

    private _method: SocketMethod;
    private _host: string;
    private _hdl: WebSocket;
    private _clientUnlisten = false;
    private _retrys: number = 0;

    protected connect(suc: () => void, err: ErrorCallBack) {
        if (this._hdl) {
            // 已经连接上
            suc();
            return;
        }

        // 连接服务器
        let host = (Session.ISHTTPS ? "wss://" : "ws://") + this._host + (this._method == SocketMethod.JSON ? "/json" : "/pb");
        this._hdl = new WebSocket(host);
        this._hdl.onopen = (ev) => {
            console.log("成功连接到服务器: " + host);
            // 连接成功后自动初始化
            this.prepare(suc, err);
            // 清除重试次数
            this._retrys = 0;
        };
        this._hdl.onclose = (ev) => {
            this._hdl = null;
            console.log("服务器关闭: " + host);
            // 重新连接的onopen的suc回调中会重新注册所有的成功，所以这个地方就需要清空监听表，防止多次监听
            this._listens.clear();
            // 判断是服务端主动断开的连接
            let reason = toJsonObject(ev.reason);
            if (reason) {
                if (reason.code == STATUS.MULTIDEVICE) {
                    let msg = "服务器主动断开了连接：多客户端登陆";
                    err && err(new StatusError(reason.code, msg));
                    return;
                }
                this.doRetry(suc, err);
            }
            else if (!this._clientUnlisten) {
                this.doRetry(suc, err);
            }
        };
        this._hdl.onmessage = (ev) => {
            //console.log("收到消息: " + ev.data);
            let obj = this.decode(ev.data);
            if (!obj) {
                console.log("收到了无法解析的消息 " + ev.data);
                return;
            }
            let id = obj["_cmid"];
            let fetching: FetchingModel;
            let listen = obj["_listening"];
            if (listen == 1) {
                // 收到了一个从服务器发来的监听消息
                // 监听的注册、取消事件均不激发上层的成功回调
                return;
            }
            else if (listen == 2) {
                // 取消监听，不做任何处理，unlisten的时候已经去除关系
                return;
            }
            else if (listen == 3) {
                // 如果是服务端发回的消息时间，则需要正确处理
                fetching = this._listens.get(id);
            }
            else {
                // 普通的请求-响应模型
                fetching = this._fetchs.get(id);
                if (fetching)
                    this._fetchs.delete(id);
            }
            if (!fetching) {
                console.log("没有找到对应的模型 " + id);
                return;
            }
            // 反序列化
            let m = fetching.model;
            m.parseData(<any>obj, () => {
                let suc = fetching.suc;
                suc && suc(m);
            }, e => {
                let err = fetching.err;
                err && err(e);
            });
            if (m.enableWaiting)
                m.hideWaiting();
        };
        this._hdl.onerror = (ev) => {
            console.log("遇到错误: " + ev.type);
        };
    }

    protected doRetry(suc: () => void, err: ErrorCallBack) {
        this._retrys++;
        setTimeout(() => {
            console.log("重新连接第" + this._retrys + "次");
            setTimeout(() => {
                this.connect(suc, err);
            }, 1000 * RetryTime(this._retrys));
        })
    }

    fetch<T extends Base>(m: T, suc: SuccessCallback<T>, err: ErrorCallBack) {
        if (m.binary != this._method) {
            err(new Error("model的格式化类型和connector不一致"));
            return;
        }
        this.connect(() => {
            this.doFetch(m, suc, err);
        }, err);
    }

    protected doFetch<T extends Base>(m: T, suc: SuccessCallback<T>, err: ErrorCallBack) {
        let buf = this.encode(m, ListenMode.NONE);
        if (!buf) {
            console.log("model没有成功编码为buffer对象");
            return;
        }
        if (m.enableWaiting)
            m.showWaiting();
        this._hdl.send(buf);
        this._fetchs.set(m.cmid, {
            model: m,
            suc: suc,
            err: err
        });
    }

    listen<T extends Base>(m: T, suc: SuccessCallback<T>, err: ErrorCallBack) {
        if (m.binary != this._method) {
            err(new Error("model的格式化类型和connector不一致"));
            return;
        }
        this._clientUnlisten = false;
        this.connect(() => {
            this.doListen(m, suc, err);
        }, err);
    }

    protected doListen<T extends Base>(m: T, suc: SuccessCallback<T>, err: ErrorCallBack) {
        if (m.binary != this._method) {
            err(new Error("model的格式化类型和connector不一致"));
            return;
        }
        this.connect(() => {
            let buf = this.encode(m, ListenMode.LISTEN);
            if (!buf) {
                console.log("model没有成功编码为buffer对象");
                return;
            }
            this._listens.set(m.cmid, {
                model: m,
                suc: suc,
                err: err
            });
            this._hdl.send(buf);
        }, err);
    }

    unlisten<T extends Base>(m: T, suc: SuccessCallback<T>, err: ErrorCallBack) {
        if (!this._hdl || this._hdl.readyState != WebSocket.OPEN)
            return;
        let buf = this.encode(m, ListenMode.UNLINSTEN);
        if (!buf) {
            console.log("model没有成功编码为buffer对象");
            return;
        }
        this._clientUnlisten = true
        this._listens.delete(m.cmid);
        this._hdl.send(buf);
        this._hdl.close();
    }

    protected encode<T extends Base>(m: T, listen: ListenMode): string {
        let params = m.requestParams();
        let obj: IndexedObject = {
            action: m.action,
            url: m.requestUrl()
        };
        for (let k in params.fields) {
            let f = params.fields[k];
            obj[k] = f;
        }
        //客户端mid，和服务端的mid存在区别
        if (listen == ListenMode.LISTEN)
            obj["_listen"] = 1;
        else if (listen == ListenMode.UNLINSTEN)
            obj["_listen"] = 2;

        if (this._method == SocketMethod.JSON) {
            obj["render"] = "json";
            return JSON.stringify(obj);
        }
        else if (this._method == SocketMethod.PROTOBUF) {

        }
        return null;
    }

    protected decode(msg: any): IndexedObject {
        if (this._method == SocketMethod.JSON) {
            return toJsonObject(msg);
        }
        else if (this._method == SocketMethod.PROTOBUF) {

        }
        return null;
    }

    private _fetchs = new CMap<string, FetchingModel>();
    private _listens = new CMap<string, FetchingModel>();

    private prepare(suc: () => void, err: ErrorCallBack) {
        // 发送一个空消息
        let clz = Base.Impl.models["AuthedNull"];
        let m = new clz();
        m.action = "socket.init";
        m.cacheTime = 0;
        this.fetch(m, suc, err);
    }
}

export class SocketSession extends CacheSession {

    method: SocketMethod = SocketMethod.JSON;

    // url和connector的连接池
    private _pool = new CMap<string, Connector>();

    private getConnector<T extends Base>(m: T): Connector {
        let host = m.wshost;
        let cntor = this._pool.get(host);
        if (!cntor) {
            cntor = new Connector(host, this.method);
            this._pool.set(host, cntor);
        }
        return cntor;
    }

    protected doFetch<T extends Base>(m: T, suc: SuccessCallback<T>, err: ErrorCallBack) {
        this.getConnector(m).fetch(m, suc, err);
    }

    listen<T extends Base>(m: T, suc: SuccessCallback<T>, err: ErrorCallBack) {
        this.getConnector(m).listen(m, suc, err);
    }

    unlisten<T extends Base>(m: T, suc: SuccessCallback<T>, err: ErrorCallBack) {
        this.getConnector(m).unlisten(m, suc, err);
    }
}
