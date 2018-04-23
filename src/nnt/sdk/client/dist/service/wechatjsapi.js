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
var utils_1 = require("../utils");
var nnt_1 = require("./nnt");
var media_1 = require("../media");
var JSBRIDGE_AVALIABLE;
var CHANNEL = "wechat";
var WechatJsApi = /** @class */ (function (_super) {
    __extends(WechatJsApi, _super);
    function WechatJsApi() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    WechatJsApi.prototype.prepare = function (info, cb) {
        var _this = this;
        utils_1.LoadJs("wechat-jsapi", "https://res.wx.qq.com/open/js/jweixin-1.2.0.js", function () {
            _super.prototype.prepare.call(_this, info, cb);
        });
    };
    WechatJsApi.prototype.share = function (cnt) {
        if (cnt.method != service_1.ShareMethod.PASSIVE)
            return;
        this._doConfig(function () {
            function suc() {
                cnt.raiseEvent(service_1.Service.EVENT_SUCCESS);
            }
            ;
            function cancel() {
                cnt.raiseEvent(service_1.Service.EVENT_FAILED, new Error("取消分享"));
            }
            ;
            wx.onMenuShareTimeline({
                title: cnt.title,
                link: cnt.link,
                imgUrl: cnt.image,
                success: suc,
                cancel: cancel
            });
            wx.onMenuShareAppMessage({
                title: cnt.title,
                desc: cnt.desc,
                link: cnt.link,
                imgUrl: cnt.image,
                type: 'link',
                success: suc,
                cancel: cancel
            });
            wx.onMenuShareQQ({
                title: cnt.title,
                desc: cnt.desc,
                link: cnt.link,
                imgUrl: cnt.image,
                success: suc,
                cancel: cancel
            });
            wx.onMenuShareWeibo({
                title: cnt.title,
                desc: cnt.desc,
                link: cnt.link,
                imgUrl: cnt.image,
                success: suc,
                cancel: cancel
            });
            wx.onMenuShareQZone({
                title: cnt.title,
                desc: cnt.desc,
                link: cnt.link,
                imgUrl: cnt.image,
                success: suc,
                cancel: cancel
            });
        }, function (err) {
            cnt.raiseEvent(service_1.Service.EVENT_FAILED, err);
        });
    };
    WechatJsApi.prototype._doConfig = function (suc, error) {
        // 如果当前的url和之前的不一样，则需要重新配置
        var href = location.href;
        if (this._prevurl != href) {
            service_1.SdkGet("sdk.environment", {
                channel: 'wechat',
                href: href
            }, function (data) {
                var cfg = data.payload.wechat_jsapicfg;
                wx.config(cfg);
                wx.ready(function () {
                    suc();
                });
                wx.error(function (res) {
                    error(new Error(utils_1.toJson(res)));
                });
            }, function (err) {
                error(err);
            });
        }
        else {
            suc();
        }
    };
    WechatJsApi.prototype.audio = function (cnt) {
        if (utils_1.Mask.Has(cnt.acquire, service_1.AudioContent.RECORDER)) {
            cnt.recorder = new WcJsAudioRecorder();
        }
        cnt.raiseEvent(service_1.Service.EVENT_SUCCESS);
    };
    WechatJsApi.prototype.image = function (cnt) {
        if (utils_1.Mask.Has(cnt.acquire, service_1.ImageContent.PICKER)) {
            cnt.picker = new WcJsImagePicker();
        }
        if (utils_1.Mask.Has(cnt.acquire, service_1.ImageContent.PRESENTER)) {
            cnt.presenter = new WcJsImagePresenter();
        }
        cnt.raiseEvent(service_1.Service.EVENT_SUCCESS);
    };
    WechatJsApi.prototype.doPay = function (cnt) {
        if (!JSBRIDGE_AVALIABLE) {
            var err = new Error("现在无法进行支付");
            cnt.raiseEvent(service_1.Service.EVENT_FAILED);
            return;
        }
        WeixinJSBridge.invoke('getBrandWCPayRequest', cnt.payload, function (res) {
            if (res.err_msg == "get_brand_wcpay_request:ok") {
                cnt.raiseEvent(service_1.Service.EVENT_SUCCESS);
            } // 使用以上方式判断前端返回,微信团队郑重提示：res.err_msg将在用户支付成功后返回    ok，但并不保证它绝对可靠。
            else if (res.err_msg == "get_brand_wcpay_request:cancel") {
                var err = new Error("取消支付");
                cnt.raiseEvent(service_1.Service.EVENT_FAILED, err);
            }
            else {
                var err = new Error("支付失败");
                cnt.raiseEvent(service_1.Service.EVENT_FAILED, err);
            }
        });
    };
    return WechatJsApi;
}(nnt_1.NntService));
exports.WechatJsApi = WechatJsApi;
var WcJsImagePicker = /** @class */ (function (_super) {
    __extends(WcJsImagePicker, _super);
    function WcJsImagePicker() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    WcJsImagePicker.prototype.pick = function (suc) {
        var opt = {
            count: this.count,
            sizeType: [],
            sourceType: []
        };
        if (utils_1.Mask.Has(this.size, service_1.ImagePicker.ORIGIN))
            opt.sizeType.push("original");
        if (utils_1.Mask.Has(this.size, service_1.ImagePicker.COMPRESSED))
            opt.sizeType.push("compressed");
        if (utils_1.Mask.Has(this.source, service_1.ImagePicker.ALBUM))
            opt.sourceType.push("album");
        if (utils_1.Mask.Has(this.source, service_1.ImagePicker.CAMERA))
            opt.sourceType.push("camera");
        opt.success = function (res) {
            var ids = res.localIds;
            utils_1.ArrayT.AsyncConvert(ids, function (next, id) {
                // wx.getLocalImgData 接口只能在ios下使用，所以还是走通过服务器抓取素材得形式来获得图片
                wx.uploadImage({
                    localId: id,
                    isShowProgressTips: 1,
                    success: function (res) {
                        var sid = res.serverId;
                        next(sid);
                    }
                });
            }, function (sids) {
                // 通过wechat得接口将图片拿到图床
                service_1.SdkGet("sdk.remoteimages", {
                    uid: nnt_1.NntService.UID,
                    channel: CHANNEL,
                    ids: sids.join(",")
                }, function (data) {
                    var medias = utils_1.ArrayT.Convert(data.paths, function (e) {
                        return new media_1.UrlMedia(e);
                    });
                    suc(medias);
                }, function (err) {
                    suc([]);
                });
            });
        };
        wx.chooseImage(opt);
    };
    return WcJsImagePicker;
}(service_1.ImagePicker));
var WcJsImagePresenter = /** @class */ (function (_super) {
    __extends(WcJsImagePresenter, _super);
    function WcJsImagePresenter() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    WcJsImagePresenter.prototype.present = function () {
        wx.previewImage({
            current: this.current,
            urls: this.urls
        });
    };
    return WcJsImagePresenter;
}(service_1.ImagePresenter));
var RECORDING = false;
var PLAYING = false;
var WcJsAudioRecorder = /** @class */ (function (_super) {
    __extends(WcJsAudioRecorder, _super);
    function WcJsAudioRecorder() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    WcJsAudioRecorder.prototype.start = function (cb) {
        var _this = this;
        if (PLAYING) {
            cb && cb(new Error("正在回放"));
            return;
        }
        if (RECORDING) {
            cb && cb(new Error("正在录音"));
            return;
        }
        RECORDING = true;
        this._localId = null;
        wx.startRecord();
        wx.onVoiceRecordEnd({
            // 录音时间超过一分钟没有停止的时候会执行 complete 回调
            complete: function (res) {
                _this._localId = res.localId;
                RECORDING = false;
            }
        });
    };
    WcJsAudioRecorder.prototype.stop = function (cb) {
        var _this = this;
        if (RECORDING) {
            wx.stopRecord({
                success: function (res) {
                    RECORDING = false;
                    _this._localId = res.localId;
                    cb && _this.doStop(cb);
                }
            });
        }
        else if (PLAYING) {
            wx.stopVoice({
                localId: this._localId
            });
            PLAYING = false;
        }
        else if (this._localId) {
            cb && this.doStop(cb);
        }
        else {
            cb && cb(null);
        }
    };
    WcJsAudioRecorder.prototype.play = function (cb) {
        if (PLAYING) {
            cb && cb(new Error("正在回放"));
            return;
        }
        if (RECORDING) {
            cb && cb(new Error("正在录音"));
            return;
        }
        PLAYING = true;
        wx.playVoice({
            localId: this._localId
        });
        wx.onVoicePlayEnd({
            success: function (res) {
                PLAYING = false;
            }
        });
    };
    WcJsAudioRecorder.prototype.doStop = function (cb) {
        // 上传到服务器获得path
        wx.uploadVoice({
            localId: this._localId,
            isShowProgressTips: 1,
            success: function (res) {
                var sid = res.serverId;
                // 通过wechat得接口将图片拿到图床
                service_1.SdkGet("sdk.remoteaudios", {
                    uid: nnt_1.NntService.UID,
                    channel: CHANNEL,
                    ids: [sid].join(',')
                }, function (data) {
                    var path = data.paths[0];
                    cb(new media_1.UrlMedia(path));
                }, function (err) {
                    cb(null);
                });
            }
        });
    };
    return WcJsAudioRecorder;
}(service_1.AudioRecorder));
function onBridgeReady() {
    JSBRIDGE_AVALIABLE = true;
}
var DOC = document;
if (typeof WeixinJSBridge == "undefined") {
    if (DOC.addEventListener) {
        DOC.addEventListener('WeixinJSBridgeReady', onBridgeReady, false);
    }
    else if (DOC.attachEvent) {
        DOC.attachEvent('WeixinJSBridgeReady', onBridgeReady);
        DOC.attachEvent('onWeixinJSBridgeReady', onBridgeReady);
    }
}
else {
    onBridgeReady();
}
