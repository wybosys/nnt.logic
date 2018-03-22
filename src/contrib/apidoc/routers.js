"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
var router_1 = require("../../nnt/core/router");
var proto_1 = require("../../nnt/core/proto");
var core_1 = require("../../nnt/core/core");
var url_1 = require("../../nnt/core/url");
var RoutersInfo = /** @class */ (function () {
    function RoutersInfo() {
    }
    __decorate([
        proto_1.array(1, proto_1.string_t, [proto_1.output], "所有可用的router")
    ], RoutersInfo.prototype, "paths", void 0);
    RoutersInfo = __decorate([
        proto_1.model([proto_1.hidden])
    ], RoutersInfo);
    return RoutersInfo;
}());
var RRouters = /** @class */ (function () {
    function RRouters() {
        this.action = "routers";
    }
    RRouters.prototype.info = function (trans) {
        var m = trans.model;
        m.paths = [];
        // 从server的配置上读取所有的router，再处理
        var srv = core_1.static_cast(trans.server);
        var routers = new Array();
        srv.router.forEach(function (e) {
            var path = url_1.expand(e);
            core_1.Require(path, function (clz) {
                routers.push(new clz());
            });
        });
        routers.forEach(function (e) {
            var as = router_1.GetAllActionNames(e);
            as.forEach(function (a) {
                m.paths.push(e.action + "." + a);
            });
        });
        trans.submit();
    };
    __decorate([
        router_1.action(RoutersInfo)
    ], RRouters.prototype, "info", null);
    return RRouters;
}());
exports.RRouters = RRouters;
