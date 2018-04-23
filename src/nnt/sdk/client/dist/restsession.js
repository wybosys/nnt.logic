"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var session_1 = require("./session");
var model_1 = require("./model");
var utils_1 = require("./utils");
var cachesession_1 = require("./cachesession");
// 弱心跳的默认间隔
var WEAK_HEARTBEAT = 2;
// 和models.ts中同步
var REST_NEED_RELISTEN = 10001; // rest访问需要重新启动监听
var RestSession = /** @class */ (function (_super) {
    __extends(RestSession, _super);
    function RestSession() {
        var _this = _super.call(this) || this;
        _this._weakRetrys = 0;
        _this.startWeakHeartbeat();
        return _this;
    }
    // 启动弱心跳
    RestSession.prototype.startWeakHeartbeat = function () {
        var _this = this;
        // 延迟5s启动弱心跳
        setTimeout(function () {
            _this.weakHeartbeat();
        }, WEAK_HEARTBEAT * 1000);
    };
    RestSession.prototype.doFetch = function (m, suc, err) {
        var url = m.host + m.requestUrl();
        // 判断需要不需加上前缀
        if (url.indexOf("http") != 0)
            url = (session_1.Session.ISHTTPS ? "https://" : "http://") + url;
        var params = m.requestParams();
        if (m.method == model_1.HttpMethod.GET) {
            var p = [];
            for (var k in params.fields) {
                var f = params.fields[k];
                p.push(k + "=" + encodeURIComponent(f));
            }
            if (p.length)
                url += "&" + p.join("&");
            // 如果存在文件，就必须是post方式
            if (Object.keys(params.files).length || Object.keys(params.medias).length) {
                if (m.enableWaiting)
                    m.showWaiting();
                var data_1 = new FormData();
                for (var fk in params.files) {
                    var f = params.files[fk];
                    data_1.append(fk, f);
                }
                // 处理媒体文件
                utils_1.ObjectT.SeqForin(params.medias, function (v, k, next) {
                    v.save(function (res) {
                        data_1.append(k, res);
                        next();
                    });
                }, function () {
                    Post(url, data_1, function (e, resp) {
                        if (e) {
                            err && err(e, resp);
                            if (m.enableWaiting)
                                m.hideWaiting();
                            return;
                        }
                        m.parseData(resp.data, function () {
                            suc && suc(m);
                        }, function (e) {
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
                Get(url, function (e, resp) {
                    if (e) {
                        err && err(e, resp);
                        if (m.enableWaiting)
                            m.showWaiting();
                        return;
                    }
                    m.parseData(resp.data, function () {
                        suc && suc(m);
                    }, function (e) {
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
            var data_2 = new FormData();
            for (var fk in params.fields) {
                var f = params.fields[fk];
                data_2.append(fk, f);
            }
            for (var fk in params.files) {
                var f = params.files[fk];
                data_2.append(fk, f);
            }
            // 处理媒体文件
            utils_1.ObjectT.SeqForin(params.medias, function (v, k, next) {
                v.save(function (res) {
                    data_2.append(k, res);
                    next();
                });
            }, function () {
                Post(url, data_2, function (e, resp) {
                    if (e) {
                        err && err(e, resp);
                        if (m.enableWaiting)
                            m.hideWaiting();
                        return;
                    }
                    m.parseData(resp.data, function () {
                        suc && suc(m);
                    }, function (e) {
                        err && err(e);
                    });
                    if (m.enableWaiting)
                        m.hideWaiting();
                });
            });
        }
    };
    // 监听模型，url后附加 _listen=true|false，之后此model长期保存，当服务端有数据时，更新此model再激发成功回调
    RestSession.prototype.listen = function (m, suc, err) {
        var url = m.host + m.requestUrl();
        if (url.indexOf("http") != 0)
            url = (session_1.Session.ISHTTPS ? "https://" : "http://") + url;
        var params = m.requestParams();
        if (m.method == model_1.HttpMethod.GET) {
            var p = [];
            for (var k in params.fields) {
                var f = params.fields[k];
                p.push(k + "=" + encodeURIComponent(f));
            }
            p.push("_listen=1");
            if (p.length)
                url += "&" + p.join("&");
            Get(url, function (e, resp) {
                if (e) {
                    err && err(e, resp);
                    return;
                }
                var t = new ListenObject();
                t.model = m;
                t.suc = suc;
                m.parseData(resp.data, function () {
                    session_1.Session.NOC = false;
                    // 服务器会返回_mid代表model在服务端相对该用户得唯一标记
                    var mid = m["_mid"];
                    // 客户端维护mid和model的映射表
                    listeners[mid] = t;
                }, function (e) {
                    retrylisteners.push(t);
                    err && err(e);
                });
            });
        }
        else {
            var data = new FormData();
            for (var fk in params.fields) {
                var f = params.fields[fk];
                data.append(fk, f);
            }
            data.append("_listen", "1");
            Post(url, data, function (e, resp) {
                if (e) {
                    err && err(e, resp);
                    return;
                }
                m.parseData(resp.data, function () {
                    session_1.Session.NOC = false;
                    var mid = m["_mid"];
                    var t = new ListenObject();
                    t.model = m;
                    t.suc = suc;
                    listeners[mid] = t;
                }, function (e) {
                    err && err(e);
                });
            });
        }
    };
    // 取消监听
    RestSession.prototype.unlisten = function (m, suc, err) {
        var url = m.host + m.requestUrl();
        if (url.indexOf("http") != 0)
            url = (session_1.Session.ISHTTPS ? "https://" : "http://") + url;
        var params = m.requestParams();
        if (m.method == model_1.HttpMethod.GET) {
            var p = [];
            for (var k in params.fields) {
                p.push(k + "=" + params.fields[k]);
            }
            p.push("_listen=2");
            if (p.length)
                url += "&" + p.join("&");
            Get(url, function (e, resp) {
                if (e) {
                    err && err(e, resp);
                    return;
                }
                m.parseData(resp.data, function () {
                    suc && suc(m);
                }, function (e) {
                    err && err(e);
                });
            });
        }
        else {
            var data = new FormData();
            for (var fk in params.fields) {
                var f = params.fields[fk];
                data.append(fk, f);
            }
            data.append("_listen", "2");
            Post(url, data, function (e, resp) {
                if (e) {
                    err && err(e, resp);
                    return;
                }
                m.parseData(resp.data, function () {
                    suc && suc(m);
                }, function (e) {
                    err && err(e);
                });
            });
        }
    };
    // 弱心跳
    RestSession.prototype.weakHeartbeat = function () {
        var _this = this;
        // 从Impl拿到业务层构造的请求对象
        var clz = model_1.Base.Impl.models["RestUpdate"];
        var m = new clz();
        m.action = "rest.update";
        m.enableWaiting = false;
        m.cacheTime = 0;
        this.fetch(m, function () {
            _this._weakRetrys = 0;
            if (m.code == REST_NEED_RELISTEN) {
                // 建立监听
                retrylisteners.forEach(function (t) {
                    session_1.Session.Listen(t.model, t.suc);
                });
                retrylisteners.length = 0;
                // 重新监听成功监听的
                for (var ek in listeners) {
                    var obj = listeners[ek];
                    session_1.Session.Listen(obj.model, obj.suc);
                }
                listeners = {};
            }
            else if (m.models) {
                session_1.Session.NOC = false;
                for (var mid in m.models) {
                    var t = listeners[mid];
                    if (t == null) {
                        console.log("服务端返回了一个不存在的mid:" + mid);
                        continue;
                    }
                    // 数据填入model和激活回调
                    model_1.Decode(t.model, m.models[mid]);
                    t.suc(t.model);
                }
            }
            setTimeout(function () {
                _this.weakHeartbeat();
            }, m.heartbeatTime * 1000);
        }, function () {
            var tm = m.heartbeatTime || WEAK_HEARTBEAT;
            // 错误时，用之前的配置继续重试
            setTimeout(function () {
                console.log("弱心跳重连第" + _this._weakRetrys + "次");
                _this.weakHeartbeat();
            }, tm * 1000 * utils_1.RetryTime(++_this._weakRetrys));
        });
    };
    return RestSession;
}(cachesession_1.CacheSession));
exports.RestSession = RestSession;
var ListenObject = /** @class */ (function () {
    function ListenObject() {
    }
    return ListenObject;
}());
// 保存正在监听的models, mid=>ListenObject
var listeners = {};
// 如果监听发起失败，则当服务端返回重新监听时，建立监听
var retrylisteners = new Array();
function Get(url, cb) {
    var hdl = utils_1.InstanceXmlHttpRequest();
    hdl.onreadystatechange = function (e) {
        ProcessRequest(hdl, e, cb);
    };
    hdl.open("GET", url, true);
    hdl.send(null);
}
function Post(url, data, cb) {
    var hdl = utils_1.InstanceXmlHttpRequest();
    hdl.onreadystatechange = function (e) {
        ProcessRequest(hdl, e, cb);
    };
    hdl.open("POST", url, true);
    hdl.send(data);
}
var SUCCESS = [200];
function ProcessRequest(hdl, ev, cb) {
    switch (hdl.readyState) {
        case XMLHttpRequest.DONE:
            {
                if (SUCCESS.indexOf(hdl.status) == -1) {
                    cb(new Error("请求失败 " + hdl.status), null);
                    return;
                }
                var ct = hdl.getResponseHeader("content-type");
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
