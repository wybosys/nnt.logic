"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var service_1 = require("./service");
var session_1 = require("./session");
var nnt_1 = require("./service/nnt");
var apicld_1 = require("./service/apicld");
var wechatjsapi_1 = require("./service/wechatjsapi");
var mock_1 = require("./service/mock");
var Services = /** @class */ (function () {
    function Services() {
    }
    Services.Fetch = function (cnt, suc, err) {
        var proc = Services._default[cnt.proc];
        cnt.addListener(service_1.Service.EVENT_SUCCESS, function () {
            suc(cnt);
        });
        if (err)
            cnt.addListener(service_1.Service.EVENT_FAILED, err);
        proc.call(Services._default, cnt);
    };
    Services.Launch = function (cb) {
        var cnt = new service_1.InfoContent();
        service_1.SdkGet("sdk.info", {
            url: session_1.Session.LOCATION
        }, function (data) {
            cnt.payload = data.payload;
            LOGINS = cnt.logins = data.logins;
            SHARES = cnt.shares = data.shares;
            PAYS = cnt.pays = data.pays;
            var svc;
            switch (data.channel) {
                case "common":
                    svc = new nnt_1.NntService();
                    break;
                case "apicloud":
                    svc = new apicld_1.ApiCldService();
                    break;
                case "wechat":
                    svc = new wechatjsapi_1.WechatJsApi();
                    break;
                default:
                    svc = new mock_1.MockService();
                    break;
            }
            Services._default = svc;
            session_1.Session.CHANNEL = data.channel;
            // 使用特定的服务初始化信息
            svc.prepare(cnt, function () {
                cb(cnt);
            });
        });
    };
    return Services;
}());
exports.Services = Services;
var LOGINS;
var SHARES;
var PAYS;
