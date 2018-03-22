"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var utils_1 = require("./utils");
var eventdispatcher_1 = require("./eventdispatcher");
var Session = /** @class */ (function () {
    function Session() {
    }
    // 获取一个分页数据
    Session.prototype.page = function (m, suc, err) {
        if (m.ended) {
            m.items.length = 0;
            suc(m);
            return;
        }
        if (!m.limit)
            m.limit = Session.PAGE_LEN;
        if (m.all == null)
            m.all = [];
        this.fetch(m, function (m) {
            if (m.items.length) {
                m.items.forEach(function (e) {
                    m.all.push(e);
                });
            }
            m.ended = m.items.length < m.limit;
            suc(m);
        }, err);
    };
    // 设置为默认session
    Session.prototype.setAsDefault = function () {
        Session._default = this;
    };
    Session.Fetch = function (m, suc, err) {
        Session._default.fetch(m, suc, err);
    };
    Session.Listen = function (m, suc, err) {
        Session._default.listen(m, suc, err);
    };
    Session.Unlisten = function (m, suc, err) {
        Session._default.unlisten(m, suc, err);
    };
    Session.Page = function (m, suc, err) {
        Session._default.page(m, suc, err);
    };
    Object.defineProperty(Session, "SID", {
        get: function () {
            return Session._SID;
        },
        set: function (val) {
            if (val != Session._SID) {
                Session._SID = val;
                Session.EVENT.raiseEvent(Session.EVENT_SID_CHANGED);
            }
        },
        enumerable: true,
        configurable: true
    });
    Session.ISHTTPS = document.location.protocol == "https:";
    Session.EVENT_SID_CHANGED = "::nnt::session::sid::changed";
    // 每次启动生成的CLIENTID
    Session.CID = utils_1.Random.Rangei(0, 10000);
    // 新客户端标记，只要有一次成功的rest.update请求，则变成旧客户端 new one client
    Session.NOC = true;
    // Model可以含有fields的最大数量
    Session.MODEL_FIELDS_MAX = 100;
    // 默认的Cache数据库名称
    Session.CACHE_DB = "::nnt::app";
    // 默认的一页的数目
    Session.PAGE_LEN = 10;
    // 当前连接
    Session.LOCATION = location.href;
    Session.EVENT = new eventdispatcher_1.EventDispatcher();
    return Session;
}());
exports.Session = Session;
