import {ErrorCallBack, Session, SuccessCallback} from "./session";
import {Base, Decode, HttpMethod, IndexedObject} from "./model";
import {InstanceXmlHttpRequest, ObjectT, RetryTime} from "./utils";
import {CacheSession} from "./cachesession";

// 弱心跳的默认间隔
let WEAK_HEARTBEAT = 2;

// 和models.ts中同步
const REST_NEED_RELISTEN = 10001; // rest访问需要重新启动监听

export class RestSession extends CacheSession {

    constructor() {
        super();
        this.startWeakHeartbeat();
    }

    // 启动弱心跳
    startWeakHeartbeat() {
        // 延迟5s启动弱心跳
        setTimeout(() => {
            this.weakHeartbeat();
        }, WEAK_HEARTBEAT * 1000);
    }

    protected doFetch<T extends Base>(m: T, suc: SuccessCallback<T>, err: ErrorCallBack) {
        let url = m.host + m.requestUrl();
        // 判断需要不需加上前缀
        if (url.indexOf("http") != 0)
            url = (Session.ISHTTPS ? "https://" : "http://") + url;
        let params = m.requestParams();
        if (m.method == HttpMethod.GET) {
            let p = [];
            for (let k in params.fields) {
                let f = params.fields[k];
                p.push(k + "=" + encodeURIComponent(f));
            }
            if (p.length)
                url += "&" + p.join("&");
            // 如果存在文件，就必须是post方式
            if (Object.keys(params.files).length || Object.keys(params.medias).length) {
                if (m.enableWaiting)
                    m.showWaiting();
                let data = new FormData();
                for (let fk in params.files) {
                    let f = params.files[fk];
                    data.append(fk, f);
                }
                // 处理媒体文件
                ObjectT.SeqForin(params.medias, (v, k, next) => {
                    v.save(res => {
                        data.append(k, res);
                        next();
                    });
                }, () => {
                    Post(url, data, (e, resp) => {
                        if (e) {
                            err && err(e, resp);
                            if (m.enableWaiting)
                                m.hideWaiting();
                            return;
                        }
                        m.parseData(resp.data, () => {
                            suc && suc(m);
                        }, (e) => {
                            err && err(e);
                        });
                        if (m.enableWaiting)
                            m.hideWaiting();
                    });
                });
            }
            else {
                if (m.enableWaiting)
                    m.showWaiting();
                Get(url, (e, resp) => {
                    if (e) {
                        err && err(e, resp);
                        if (m.enableWaiting)
                            m.showWaiting();
                        return;
                    }
                    m.parseData(resp.data, () => {
                        suc && suc(m);
                    }, (e) => {
                        err && err(e);
                    });
                    if (m.enableWaiting)
                        m.hideWaiting();
                });
            }
        }
        else {
            if (m.enableWaiting)
                m.showWaiting();
            let data = new FormData();
            for (let fk in params.fields) {
                let f = params.fields[fk];
                data.append(fk, f);
            }
            for (let fk in params.files) {
                let f = params.files[fk];
                data.append(fk, f);
            }
            // 处理媒体文件
            ObjectT.SeqForin(params.medias, (v, k, next) => {
                v.save(res => {
                    data.append(k, res);
                    next();
                });
            }, () => {
                Post(url, data, (e, resp) => {
                    if (e) {
                        err && err(e, resp);
                        if (m.enableWaiting)
                            m.hideWaiting();
                        return;
                    }
                    m.parseData(resp.data, () => {
                        suc && suc(m);
                    }, (e) => {
                        err && err(e);
                    });
                    if (m.enableWaiting)
                        m.hideWaiting();
                });
            });
        }
    }

    // 监听模型，url后附加 _listen=true|false，之后此model长期保存，当服务端有数据时，更新此model再激发成功回调
    listen<T extends Base>(m: T, suc: SuccessCallback<T>, err: ErrorCallBack) {
        let url = m.host + m.requestUrl();
        if (url.indexOf("http") != 0)
            url = (Session.ISHTTPS ? "https://" : "http://") + url;
        let params = m.requestParams();
        if (m.method == HttpMethod.GET) {
            let p = [];
            for (let k in params.fields) {
                let f = params.fields[k];
                p.push(k + "=" + encodeURIComponent(f));
            }
            p.push("_listen=1");
            if (p.length)
                url += "&" + p.join("&");
            Get(url, (e, resp) => {
                if (e) {
                    err && err(e, resp);
                    return;
                }
                let t = new ListenObject();
                t.model = m;
                t.suc = suc;
                m.parseData(resp.data, () => {
                    Session.NOC = false;
                    // 服务器会返回_mid代表model在服务端相对该用户得唯一标记
                    let mid = m["_mid"];
                    // 客户端维护mid和model的映射表
                    listeners[mid] = t;
                }, (e) => {
                    retrylisteners.push(t);
                    err && err(e);
                });
            });
        }
        else {
            let data = new FormData();
            for (let fk in params.fields) {
                let f = params.fields[fk];
                data.append(fk, f);
            }
            data.append("_listen", "1");
            Post(url, data, (e, resp) => {
                if (e) {
                    err && err(e, resp);
                    return;
                }
                m.parseData(resp.data, () => {
                    Session.NOC = false;
                    let mid = m["_mid"];
                    let t = new ListenObject();
                    t.model = m;
                    t.suc = suc;
                    listeners[mid] = t;
                }, (e) => {
                    err && err(e);
                });
            });
        }
    }

    // 取消监听
    unlisten<T extends Base>(m: T, suc: SuccessCallback<T>, err: ErrorCallBack) {
        let url = m.host + m.requestUrl();
        if (url.indexOf("http") != 0)
            url = (Session.ISHTTPS ? "https://" : "http://") + url;
        let params = m.requestParams();
        if (m.method == HttpMethod.GET) {
            let p = [];
            for (let k in params.fields) {
                p.push(k + "=" + params.fields[k]);
            }
            p.push("_listen=2");
            if (p.length)
                url += "&" + p.join("&");
            Get(url, (e, resp) => {
                if (e) {
                    err && err(e, resp);
                    return;
                }
                m.parseData(resp.data, () => {
                    suc && suc(m);
                }, (e) => {
                    err && err(e);
                });
            });
        }
        else {
            let data = new FormData();
            for (let fk in params.fields) {
                let f = params.fields[fk];
                data.append(fk, f);
            }
            data.append("_listen", "2");
            Post(url, data, (e, resp) => {
                if (e) {
                    err && err(e, resp);
                    return;
                }
                m.parseData(resp.data, () => {
                    suc && suc(m);
                }, (e) => {
                    err && err(e);
                });
            });
        }
    }

    // 弱心跳
    protected weakHeartbeat() {
        // 从Impl拿到业务层构造的请求对象
        let clz = Base.Impl.models["RestUpdate"];
        let m = new clz();
        m.action = "rest.update";
        m.enableWaiting = false;
        m.cacheTime = 0;
        this.fetch(m, () => {
            this._weakRetrys = 0;
            if (m.code == REST_NEED_RELISTEN) {
                // 建立监听
                retrylisteners.forEach(t => {
                    Session.Listen(t.model, t.suc);
                });
                retrylisteners.length = 0;
                // 重新监听成功监听的
                for (let ek in listeners) {
                    let obj: ListenObject = listeners[ek];
                    Session.Listen(obj.model, obj.suc);
                }
                listeners = {};
            }
            else if (m.models) {
                Session.NOC = false;
                for (let mid in m.models) {
                    let t: ListenObject = listeners[mid];
                    if (t == null) {
                        console.log("服务端返回了一个不存在的mid:" + mid);
                        continue;
                    }
                    // 数据填入model和激活回调
                    Decode(t.model, m.models[mid]);
                    t.suc(t.model);
                }
            }
            setTimeout(() => {
                this.weakHeartbeat();
            }, m.heartbeatTime * 1000);
        }, () => {
            let tm = m.heartbeatTime || WEAK_HEARTBEAT;
            // 错误时，用之前的配置继续重试
            setTimeout(() => {
                console.log("弱心跳重连第" + this._weakRetrys + "次");
                this.weakHeartbeat();
            }, tm * 1000 * RetryTime(++this._weakRetrys));
        });
    }

    private _weakRetrys: number = 0;

}

class ListenObject {
    model: any;
    suc: (m: any) => void;
}

// 保存正在监听的models, mid=>ListenObject
let listeners: IndexedObject = {};

// 如果监听发起失败，则当服务端返回重新监听时，建立监听
let retrylisteners = new Array();

function Get(url: string, cb: (err: Error, resp: any) => void) {
    let hdl = InstanceXmlHttpRequest();
    hdl.onreadystatechange = e => {
        ProcessRequest(hdl, e, cb);
    };
    hdl.open("GET", url, true);
    hdl.send(null);
}

function Post(url: string, data: FormData, cb: (err: Error, resp: any) => void) {
    let hdl = InstanceXmlHttpRequest();
    hdl.onreadystatechange = e => {
        ProcessRequest(hdl, e, cb);
    };
    hdl.open("POST", url, true);
    hdl.send(data);
}

let SUCCESS = [200];

function ProcessRequest(hdl: XMLHttpRequest, ev: Event, cb: (err: Error, resp: any) => void) {
    switch (hdl.readyState) {
        case XMLHttpRequest.DONE: {
            if (SUCCESS.indexOf(hdl.status) == -1) {
                cb(new Error("请求失败 " + hdl.status), null);
                return;
            }
            let ct = hdl.getResponseHeader("content-type");
            if (ct != "application/json") {
                // 返回responseText提供给非api的调用
                cb(new Error("返回了一个不支持的类型"), {
                    'code': hdl.status,
                    'data': hdl.responseText,
                    'type': ct
                });
                return;
            }
            cb(null, {
                "status": hdl.status,
                "data": JSON.parse(hdl.responseText)
            });
        }
            break;
    }
}