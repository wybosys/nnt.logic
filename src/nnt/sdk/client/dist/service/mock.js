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
var session_1 = require("../session");
var service_1 = require("../service");
var model_1 = require("../model");
var MockService = /** @class */ (function (_super) {
    __extends(MockService, _super);
    function MockService() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    MockService.prototype.prepare = function (cnt, cb) {
        cb();
    };
    MockService.prototype.auth = function (cnt) {
        cnt.raiseEvent(service_1.Service.EVENT_SUCCESS);
    };
    MockService.prototype.login = function (cnt) {
        cnt.raiseEvent(service_1.Service.EVENT_SUCCESS);
    };
    MockService.prototype.pay = function (cnt) {
        var jsobj = {};
        // 直接调用服务端的接口完成支付
        var clz = model_1.Base.Impl.models["Null"];
        var m = new clz();
        m.action = "shop.done";
        m.additionParams = { tid: jsobj["tid"] };
        session_1.Session.Fetch(m, function () {
            cnt.raiseEvent(service_1.Service.EVENT_SUCCESS);
        }, function (err) {
            cnt.raiseEvent(service_1.Service.EVENT_FAILED, err);
        });
    };
    MockService.prototype.share = function (cnt) {
        cnt.raiseEvent(service_1.Service.EVENT_FAILED);
    };
    MockService.prototype.audio = function (cnt) {
        cnt.raiseEvent(service_1.Service.EVENT_FAILED);
    };
    MockService.prototype.image = function (cnt) {
        cnt.raiseEvent(service_1.Service.EVENT_FAILED);
    };
    return MockService;
}(service_1.Service));
exports.MockService = MockService;
