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
var utils_1 = require("./utils");
var socketsession_1 = require("./socketsession");
function mid_parse(mid) {
    if (!mid)
        return null;
    var p = mid.split("/");
    var p0 = p[0].split("@");
    if (p0.length != 2)
        return null;
    return {
        user: p0[0],
        domain: utils_1.StringT.Lowercase(p0[1]),
        resources: utils_1.ArrayT.RangeOf(p, 1)
    };
}
exports.mid_parse = mid_parse;
function mid_unparse(info) {
    var r = info.user + "@" + info.domain;
    if (info.resources)
        r += "/" + info.resources.join("/");
    return r;
}
exports.mid_unparse = mid_unparse;
var ImRestSession = /** @class */ (function (_super) {
    __extends(ImRestSession, _super);
    function ImRestSession() {
        return _super.call(this) || this;
    }
    ImRestSession.prototype.fetch = function (m, suc, err) {
        if (!m.action)
            m.action = "im.send";
        m.enableWaiting = false;
        m.cacheTime = 0;
        session_1.Session._default.fetch(m, suc, err);
    };
    ImRestSession.prototype.listen = function (m, suc, err) {
        if (!m.action)
            m.action = "im.receive";
        m.enableWaiting = false;
        m.cacheTime = 0;
        session_1.Session._default.listen(m, suc, err);
    };
    ImRestSession.prototype.unlisten = function (m, suc, err) {
        session_1.Session._default.unlisten(m, suc, err);
    };
    return ImRestSession;
}(session_1.Session));
exports.ImRestSession = ImRestSession;
var ImWsSession = /** @class */ (function (_super) {
    __extends(ImWsSession, _super);
    function ImWsSession() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    ImWsSession.prototype.fetch = function (m, suc, err) {
        if (!m.action)
            m.action = "im.send";
        m.enableWaiting = false;
        m.cacheTime = 0;
        _super.prototype.fetch.call(this, m, suc, err);
    };
    ImWsSession.prototype.listen = function (m, suc, err) {
        if (!m.action)
            m.action = "im.receive";
        m.enableWaiting = false;
        m.cacheTime = 0;
        _super.prototype.listen.call(this, m, suc, err);
    };
    return ImWsSession;
}(socketsession_1.SocketSession));
exports.ImWsSession = ImWsSession;
// 用rest实现的im服务，以后其他方式实现后再切换
//export let _ImSessionImpl = ImRestSession;
exports._ImSessionImpl = ImWsSession;
var ImSession = /** @class */ (function (_super) {
    __extends(ImSession, _super);
    function ImSession() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    ImSession.prototype.send = function (m, suc, err) {
        this.fetch(m, suc, err);
    };
    return ImSession;
}(exports._ImSessionImpl));
exports.ImSession = ImSession;
