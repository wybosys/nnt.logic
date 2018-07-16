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
var nnt_1 = require("./nnt");
var service_1 = require("../service");
var model_1 = require("../model");
var session_1 = require("../session");
var media_1 = require("../media");
var utils_1 = require("../utils");
var CHANNEL = 'apicloud';
var ApiCldService = /** @class */ (function (_super) {
    __extends(ApiCldService, _super);
    function ApiCldService() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    ApiCldService.prototype.auth = function (cnt) {
        var win = window;
        this.doAuth(cnt, function () {
            if (cnt.targeturl) {
                var url = new URL(cnt.targeturl);
                var state_1 = url.searchParams.get("state");
                win['wx'].auth({}, function (res, err) {
                    if (err && err.code) {
                        switch (err.code) {
                            case 1:
                                alert('您取消了微信登录');
                                break;
                            case 2:
                                alert('您拒绝了使用微信登录');
                                break;
                            case 3:
                                alert('您尚未安装微信');
                                break;
                            default:
                                alert('唤起微信失败');
                        }
                    }
                    session_1.Session.LOCATION = "https://localhost/?code=" + res.code + "&state=" + state_1;
                    cnt.raiseEvent(service_1.Service.EVENT_SUCCESS);
                });
                cnt.targeturl = null;
                cnt.refresh = true;
            }
            else {
                cnt.raiseEvent(service_1.Service.EVENT_SUCCESS);
            }
        }, function (err) {
            cnt.raiseEvent(service_1.Service.EVENT_FAILED, err);
        });
    };
    ApiCldService.prototype.share = function (cnt) {
        var win = window;
        var wx = win['wx'];
        if (cnt.image.indexOf('widget://') == -1 && cnt.image.indexOf('fs://') == -1) {
            //必需为手机端本地路径，fs://xx/xxx.png 格式
            cnt.image = 'widget://image/shareico.png';
        }
        if (cnt.type == service_1.ShareType.IMAGE) {
            wx.shareImage({
                scene: ApiCldService.SHARE_SCENE,
                contentUrl: cnt.image
            }, cb);
        }
        else {
            wx.shareWebpage({
                scene: ApiCldService.SHARE_SCENE,
                title: cnt.title,
                description: cnt.desc,
                thumb: cnt.image,
                contentUrl: cnt.link
            }, cb);
        }
        function cb(ret, err) {
            if (ret.status) {
                cnt.raiseEvent(service_1.Service.EVENT_SUCCESS);
            }
            else {
                cnt.raiseEvent(service_1.Service.EVENT_FAILED);
            }
        }
    };
    ApiCldService.prototype.doPay = function (cnt) {
        var win = window;
        if (win['iap']) { //苹果支付
            this.payByApple(win['iap'], cnt);
        }
        else { //微信支付
            this.payByWeixin(win['wxPay'], cnt);
        }
    };
    ApiCldService.prototype.payByWeixin = function (pay, cnt) {
        var pl = cnt.payload;
        pay.payOrder({
            apiKey: pl.appid,
            orderId: pl.prepayid,
            mchId: pl.partnerid,
            nonceStr: pl.noncestr,
            timeStamp: pl.timestamp,
            package: pl.package,
            sign: pl.sign
        }, function (ret, err) {
            if (ret.status) {
                cnt.raiseEvent(service_1.Service.EVENT_SUCCESS);
            }
            else {
                cnt.raiseEvent(service_1.Service.EVENT_FAILED);
            }
        });
    };
    ApiCldService.prototype.payByApple = function (pay, cnt) {
        pay.purchase({
            productId: cnt.item,
            applicationUsername: cnt.orderid
        }, function (ret, err) {
            if (ret.state == 1) {
                service_1.SdkPost('shop.done', {
                    method: service_1.PayMethod.INAPP_APPLE,
                    channel: 'apicloud',
                    payload: JSON.stringify(ret)
                }, null, null, function (data) {
                    cnt.raiseEvent(service_1.Service.EVENT_SUCCESS);
                }, function (err) {
                    cnt.raiseEvent(service_1.Service.EVENT_FAILED, '服务器返回错误');
                    alert('服务器返回错误');
                });
            }
            else {
                cnt.raiseEvent(service_1.Service.EVENT_FAILED, err.msg);
                alert(err.msg);
            }
        });
    };
    ApiCldService.prototype.audio = function (cnt) {
        if (utils_1.Mask.Has(cnt.acquire, service_1.AudioContent.RECORDER)) {
            cnt.recorder = new ApicldAudioRecorder();
        }
        cnt.raiseEvent(service_1.Service.EVENT_SUCCESS);
    };
    ApiCldService.SHARE_SCENE = 'timeline';
    return ApiCldService;
}(nnt_1.NntService));
exports.ApiCldService = ApiCldService;
var ApicldAudioRecorder = /** @class */ (function (_super) {
    __extends(ApicldAudioRecorder, _super);
    function ApicldAudioRecorder() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    // 开始录音
    ApicldAudioRecorder.prototype.start = function (cb) {
        var win = window;
        win.api.startRecord({
            path: 'fs://party_chat_' + utils_1.timestamp() + '.amr'
        });
        cb && cb(null);
    };
    // 结束录音（结束时返回录音的内容）或者结束播放（返回null）
    ApicldAudioRecorder.prototype.stop = function (cb) {
        var win = window;
        win.api.stopRecord(function (ret, err) {
            if (ret) {
                var clz = model_1.Base.Impl.models['Null'];
                var m = new clz();
                win.api.ajax({
                    url: 'https://' + m.host,
                    method: 'post',
                    data: {
                        values: {
                            action: 'sdk.remoteaudios',
                            channel: CHANNEL
                        },
                        files: {
                            file: ret.path
                        }
                    }
                }, function (ret, err) {
                    if (ret.code == 0) {
                        var path = ret.data.paths[0];
                        cb(new media_1.UrlMedia(path));
                    }
                    else if (err) {
                        cb(null);
                        alert(err.msg + '_' + err.code);
                    }
                    else {
                        cb(null);
                    }
                });
            }
        });
    };
    // 回放录音
    ApicldAudioRecorder.prototype.play = function (cb) {
    };
    return ApicldAudioRecorder;
}(service_1.AudioRecorder));
exports.ApicldAudioRecorder = ApicldAudioRecorder;
