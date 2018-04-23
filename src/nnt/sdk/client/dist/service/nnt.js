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
var service_1 = require("../service");
var session_1 = require("../session");
var media_1 = require("../media");
var utils_1 = require("../utils");
var h5audio_1 = require("./h5audio");
// 应用配套的服务端提供的接入
var NntService = /** @class */ (function (_super) {
    __extends(NntService, _super);
    function NntService() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    NntService.prototype.prepare = function (cnt, cb) {
        // 首次请求info，payload为null
        // 选择登陆方式后并auth后，payload不为空
        // 自动再进行一次auth，就可以拿到uid
        if (cnt.payload) {
            // 尝试自动授权，获得uid
            var pl = cnt.payload;
            var auth_1 = new service_1.AuthContent();
            auth_1.method = pl.login;
            auth_1.payload = pl;
            this.doAuth(auth_1, function () {
                cnt.uid = auth_1.uid;
                cb();
            }, function (err) {
                cb();
            });
        }
        else {
            cb();
        }
    };
    NntService.prototype.auth = function (cnt) {
        this.doAuth(cnt, function () {
            cnt.raiseEvent(service_1.Service.EVENT_SUCCESS);
        }, function (err) {
            cnt.raiseEvent(service_1.Service.EVENT_FAILED, err);
        });
    };
    NntService.prototype.doAuth = function (cnt, suc, err) {
        service_1.SdkGet("sdk.auth", {
            channel: session_1.Session.CHANNEL,
            method: cnt.method,
            payload: cnt.payload
        }, function (data) {
            // 当需要跳转网页进行授权时，返回url
            cnt.targeturl = data.targeturl;
            // 如果授权成功，则直接拿到uid
            cnt.uid = data.uid;
            suc();
        }, err);
    };
    NntService.prototype.login = function (cnt) {
        service_1.SdkGet("sdk.login", {
            uid: cnt.uid
        }, function (data) {
            NntService.UID = cnt.uid;
            cnt.raiseEvent(service_1.Service.EVENT_SUCCESS);
        }, function (err) {
            cnt.raiseEvent(service_1.Service.EVENT_FAILED, err);
        });
    };
    NntService.prototype.share = function (cnt) {
        cnt.raiseEvent(service_1.Service.EVENT_FAILED, new Error("暂不支持"));
    };
    NntService.prototype.pay = function (cnt) {
        var _this = this;
        // 请求服务器获得支付签名数据
        service_1.SdkGet("sdk.pay", {
            method: cnt.method,
            uid: NntService.UID,
            channel: session_1.Session.CHANNEL,
            orderid: cnt.orderid,
            item: cnt.item,
            price: cnt.price,
            desc: cnt.desc
        }, function (data) {
            cnt.payload = data.payload;
            _this.doPay(cnt);
        }, function (err) {
            alert(err.message);
            cnt.raiseEvent(service_1.Service.EVENT_FAILED, err);
        });
    };
    NntService.prototype.doPay = function (cnt) {
        cnt.raiseEvent(service_1.Service.EVENT_SUCCESS);
    };
    NntService.prototype.audio = function (cnt) {
        var q = new utils_1.Queue();
        if (utils_1.Mask.Has(cnt.acquire, service_1.AudioContent.RECORDER)) {
            q.add(function (next) {
                h5audio_1.H5AudioRecorder.IsValid(function (support) {
                    if (support)
                        cnt.recorder = new h5audio_1.H5AudioRecorder();
                    next();
                });
            });
        }
        q.add(function (next) {
            cnt.raiseEvent(service_1.Service.EVENT_SUCCESS);
        });
        q.run();
    };
    NntService.prototype.image = function (cnt) {
        if (utils_1.Mask.Has(cnt.acquire, service_1.ImageContent.PICKER))
            cnt.picker = new NntImagePicker();
        cnt.raiseEvent(service_1.Service.EVENT_SUCCESS);
    };
    return NntService;
}(service_1.Service));
exports.NntService = NntService;
var NntImagePicker = /** @class */ (function (_super) {
    __extends(NntImagePicker, _super);
    function NntImagePicker() {
        var _this = _super.call(this) || this;
        _this._input = document.createElement('input');
        _this._input.setAttribute('type', 'file');
        _this._input.setAttribute('accept', "image/*");
        return _this;
    }
    NntImagePicker.prototype.pick = function (suc) {
        this._input.click();
        var input = this._input;
        this._input.onchange = function (e) {
            var file = input.files[0];
            service_1.SdkPost('sdk.remoteimages', {
                channel: 'common'
            }, {
                file: file
            }, null, function (data) {
                suc([new media_1.UrlMedia(data.paths[0])]);
            }, function (err) {
                suc([]);
            });
        };
    };
    return NntImagePicker;
}(service_1.ImagePicker));
