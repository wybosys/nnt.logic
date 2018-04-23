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
var model_1 = require("./model");
var session_1 = require("./session");
var cachesession_1 = require("./cachesession");
var utils_1 = require("./utils");
var status_1 = require("./status");
var ListenMode;
(function (ListenMode) {
    ListenMode[ListenMode["NONE"] = 0] = "NONE";
    ListenMode[ListenMode["LISTEN"] = 1] = "LISTEN";
    ListenMode[ListenMode["UNLINSTEN"] = 2] = "UNLINSTEN";
})(ListenMode || (ListenMode = {}));
var Connector = /** @class */ (function () {
    function Connector(host, method) {
        var _this = this;
        this._clientUnlisten = false;
        this._retrys = 0;
        this._fetchs = new model_1.CMap();
        this._listens = new model_1.CMap();
        this._host = host;
        this._method = method;
        // 如果SID变化，则断开连接，等待使用新的SID重新连接
        session_1.Session.EVENT.addListener(session_1.Session.EVENT_SID_CHANGED, function () {
            if (_this._hdl)
                _this._hdl.close();
        });
    }
    Connector.prototype.connect = function (suc, err) {
        var _this = this;
        if (this._hdl) {
            // 已经连接上
            suc();
            return;
        }
        // 连接服务器
        var host = (session_1.Session.ISHTTPS ? "wss://" : "ws://") + this._host + (this._method == model_1.SocketMethod.JSON ? "/json" : "/pb");
        this._hdl = new WebSocket(host);
        this._hdl.onopen = function (ev) {
            console.log("成功连接到服务器: " + host);
            // 连接成功后自动初始化
            _this.prepare(suc, err);
            // 清除重试次数
            _this._retrys = 0;
        };
        this._hdl.onclose = function (ev) {
            _this._hdl = null;
            console.log("服务器关闭: " + host);
            // 重新连接的onopen的suc回调中会重新注册所有的成功，所以这个地方就需要清空监听表，防止多次监听
            _this._listens.clear();
            // 判断是服务端主动断开的连接
            var reason = utils_1.toJsonObject(ev.reason);
            if (reason) {
                if (reason.code == status_1.STATUS.MULTIDEVICE) {
                    var msg = "服务器主动断开了连接：多客户端登陆";
                    err && err(new status_1.StatusError(reason.code, msg));
                    return;
                }
                _this.doRetry(suc, err);
            }
            else if (!_this._clientUnlisten) {
                _this.doRetry(suc, err);
            }
        };
        this._hdl.onmessage = function (ev) {
            //console.log("收到消息: " + ev.data);
            var obj = _this.decode(ev.data);
            if (!obj) {
                console.log("收到了无法解析的消息 " + ev.data);
                return;
            }
            var id = obj["_cmid"];
            var fetching;
            var listen = obj["_listening"];
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
                fetching = _this._listens.get(id);
            }
            else {
                // 普通的请求-响应模型
                fetching = _this._fetchs.get(id);
                if (fetching)
                    _this._fetchs.delete(id);
            }
            if (!fetching) {
                console.log("没有找到对应的模型 " + id);
                return;
            }
            // 反序列化
            var m = fetching.model;
            m.parseData(obj, function () {
                var suc = fetching.suc;
                suc && suc(m);
            }, function (e) {
                var err = fetching.err;
                err && err(e);
            });
            if (m.enableWaiting)
                m.hideWaiting();
        };
        this._hdl.onerror = function (ev) {
            console.log("遇到错误: " + ev.type);
        };
    };
    Connector.prototype.doRetry = function (suc, err) {
        var _this = this;
        this._retrys++;
        setTimeout(function () {
            console.log("重新连接第" + _this._retrys + "次");
            setTimeout(function () {
                _this.connect(suc, err);
            }, 1000 * utils_1.RetryTime(_this._retrys));
        });
    };
    Connector.prototype.fetch = function (m, suc, err) {
        var _this = this;
        if (m.binary != this._method) {
            err(new Error("model的格式化类型和connector不一致"));
            return;
        }
        this.connect(function () {
            _this.doFetch(m, suc, err);
        }, err);
    };
    Connector.prototype.doFetch = function (m, suc, err) {
        var buf = this.encode(m, ListenMode.NONE);
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
    };
    Connector.prototype.listen = function (m, suc, err) {
        var _this = this;
        if (m.binary != this._method) {
            err(new Error("model的格式化类型和connector不一致"));
            return;
        }
        this._clientUnlisten = false;
        this.connect(function () {
            _this.doListen(m, suc, err);
        }, err);
    };
    Connector.prototype.doListen = function (m, suc, err) {
        var _this = this;
        if (m.binary != this._method) {
            err(new Error("model的格式化类型和connector不一致"));
            return;
        }
        this.connect(function () {
            var buf = _this.encode(m, ListenMode.LISTEN);
            if (!buf) {
                console.log("model没有成功编码为buffer对象");
                return;
            }
            _this._listens.set(m.cmid, {
                model: m,
                suc: suc,
                err: err
            });
            _this._hdl.send(buf);
        }, err);
    };
    Connector.prototype.unlisten = function (m, suc, err) {
        if (!this._hdl || this._hdl.readyState != WebSocket.OPEN)
            return;
        var buf = this.encode(m, ListenMode.UNLINSTEN);
        if (!buf) {
            console.log("model没有成功编码为buffer对象");
            return;
        }
        this._clientUnlisten = true;
        this._listens.delete(m.cmid);
        this._hdl.send(buf);
        this._hdl.close();
    };
    Connector.prototype.encode = function (m, listen) {
        var params = m.requestParams();
        var obj = {
            action: m.action,
            url: m.requestUrl()
        };
        for (var k in params.fields) {
            var f = params.fields[k];
            obj[k] = f;
        }
        //客户端mid，和服务端的mid存在区别
        if (listen == ListenMode.LISTEN)
            obj["_listen"] = 1;
        else if (listen == ListenMode.UNLINSTEN)
            obj["_listen"] = 2;
        if (this._method == model_1.SocketMethod.JSON) {
            obj["render"] = "json";
            return JSON.stringify(obj);
        }
        else if (this._method == model_1.SocketMethod.PROTOBUF) {
        }
        return null;
    };
    Connector.prototype.decode = function (msg) {
        if (this._method == model_1.SocketMethod.JSON) {
            return utils_1.toJsonObject(msg);
        }
        else if (this._method == model_1.SocketMethod.PROTOBUF) {
        }
        return null;
    };
    Connector.prototype.prepare = function (suc, err) {
        // 发送一个空消息
        var clz = model_1.Base.Impl.models["AuthedNull"];
        var m = new clz();
        m.action = "socket.init";
        m.cacheTime = 0;
        this.fetch(m, suc, err);
    };
    return Connector;
}());
var SocketSession = /** @class */ (function (_super) {
    __extends(SocketSession, _super);
    function SocketSession() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.method = model_1.SocketMethod.JSON;
        // url和connector的连接池
        _this._pool = new model_1.CMap();
        return _this;
    }
    SocketSession.prototype.getConnector = function (m) {
        var host = m.wshost;
        var cntor = this._pool.get(host);
        if (!cntor) {
            cntor = new Connector(host, this.method);
            this._pool.set(host, cntor);
        }
        return cntor;
    };
    SocketSession.prototype.doFetch = function (m, suc, err) {
        this.getConnector(m).fetch(m, suc, err);
    };
    SocketSession.prototype.listen = function (m, suc, err) {
        this.getConnector(m).listen(m, suc, err);
    };
    SocketSession.prototype.unlisten = function (m, suc, err) {
        this.getConnector(m).unlisten(m, suc, err);
    };
    return SocketSession;
}(cachesession_1.CacheSession));
exports.SocketSession = SocketSession;
