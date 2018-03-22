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
// 第三方的服务接入
var model_1 = require("./model");
var eventdispatcher_1 = require("./eventdispatcher");
var session_1 = require("./session");
// 和服务端的type对应
var LoginMethod;
(function (LoginMethod) {
    LoginMethod[LoginMethod["PHONE"] = 1] = "PHONE";
    LoginMethod[LoginMethod["WECHAT_QRCODE"] = 33] = "WECHAT_QRCODE";
    LoginMethod[LoginMethod["WECHAT_PUB"] = 34] = "WECHAT_PUB";
    LoginMethod[LoginMethod["WECHAT_APP"] = 35] = "WECHAT_APP";
})(LoginMethod = exports.LoginMethod || (exports.LoginMethod = {}));
var ShareMethod;
(function (ShareMethod) {
    ShareMethod[ShareMethod["PASSIVE"] = 1] = "PASSIVE";
    ShareMethod[ShareMethod["WECHAT"] = 2] = "WECHAT";
})(ShareMethod = exports.ShareMethod || (exports.ShareMethod = {}));
var PayMethod;
(function (PayMethod) {
    PayMethod[PayMethod["INAPP_APPLE"] = 17] = "INAPP_APPLE";
    PayMethod[PayMethod["WECHAT_QRCODE"] = 33] = "WECHAT_QRCODE";
    PayMethod[PayMethod["WECHAT_PUB"] = 34] = "WECHAT_PUB";
    PayMethod[PayMethod["WECHAT_APP"] = 35] = "WECHAT_APP";
    PayMethod[PayMethod["WECHAT_H5"] = 36] = "WECHAT_H5";
})(PayMethod = exports.PayMethod || (exports.PayMethod = {}));
var Service = /** @class */ (function () {
    function Service() {
    }
    // 判断当前自己是否可用
    Service.IsValid = function () {
        return false;
    };
    Service.EVENT_SUCCESS = "::nnt::service::success";
    Service.EVENT_FAILED = "::nnt::service::failed";
    return Service;
}());
exports.Service = Service;
// sdk调用数据对象
var Content = /** @class */ (function (_super) {
    __extends(Content, _super);
    function Content() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return Content;
}(eventdispatcher_1.EventDispatcher));
exports.Content = Content;
var InfoContent = /** @class */ (function (_super) {
    __extends(InfoContent, _super);
    function InfoContent() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        // 支持的登陆方式
        _this.logins = new Array();
        // 支持的分享方式
        _this.shares = new Array();
        // 支持的支付方式
        _this.pays = new Array();
        return _this;
    }
    return InfoContent;
}(Content));
exports.InfoContent = InfoContent;
// 授权，调用后会返回当前支持的信息
var AuthContent = /** @class */ (function (_super) {
    __extends(AuthContent, _super);
    function AuthContent() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.proc = "auth";
        return _this;
    }
    return AuthContent;
}(Content));
exports.AuthContent = AuthContent;
// 登陆
var LoginContent = /** @class */ (function (_super) {
    __extends(LoginContent, _super);
    function LoginContent() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.proc = "login";
        return _this;
    }
    return LoginContent;
}(Content));
exports.LoginContent = LoginContent;
var ShareType;
(function (ShareType) {
    ShareType[ShareType["IMAGE"] = 1] = "IMAGE";
    ShareType[ShareType["WEBSITE"] = 2] = "WEBSITE";
})(ShareType = exports.ShareType || (exports.ShareType = {}));
// 分享
var ShareContent = /** @class */ (function (_super) {
    __extends(ShareContent, _super);
    function ShareContent() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.proc = "share";
        // 分享的方式
        _this.type = ShareType.WEBSITE;
        return _this;
    }
    return ShareContent;
}(Content));
exports.ShareContent = ShareContent;
// 充值
var PayContent = /** @class */ (function (_super) {
    __extends(PayContent, _super);
    function PayContent() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.proc = "pay";
        return _this;
    }
    return PayContent;
}(Content));
exports.PayContent = PayContent;
// 录音对象
var AudioRecorder = /** @class */ (function () {
    function AudioRecorder() {
    }
    return AudioRecorder;
}());
exports.AudioRecorder = AudioRecorder;
// 音频
var AudioContent = /** @class */ (function (_super) {
    __extends(AudioContent, _super);
    function AudioContent() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.proc = "audio";
        return _this;
    }
    AudioContent.RECORDER = 0x1; // 录音
    return AudioContent;
}(Content));
exports.AudioContent = AudioContent;
// 选择图像
// 不同渠道sdk选取图片的数据格式不同，但是通过sdk处理后，均为图床中的图片
var ImagePicker = /** @class */ (function () {
    function ImagePicker() {
        // 拾取数量
        this.count = 1;
        // 尺寸类型
        this.size = ImagePicker.ORIGIN | ImagePicker.COMPRESSED;
        // 源类型
        this.source = ImagePicker.ALBUM | ImagePicker.CAMERA;
    }
    ImagePicker.ORIGIN = 0x1; // 原图
    ImagePicker.COMPRESSED = 0x2; // 压缩过的
    ImagePicker.ALBUM = 0x1; // 相册
    ImagePicker.CAMERA = 0x2; // 照相机
    return ImagePicker;
}());
exports.ImagePicker = ImagePicker;
// 预览图像
var ImagePresenter = /** @class */ (function () {
    function ImagePresenter() {
        // 图片库
        this.urls = new Array();
    }
    return ImagePresenter;
}());
exports.ImagePresenter = ImagePresenter;
// 图像
var ImageContent = /** @class */ (function (_super) {
    __extends(ImageContent, _super);
    function ImageContent() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.proc = "image";
        return _this;
    }
    ImageContent.PICKER = 0x1;
    ImageContent.PRESENTER = 0x2;
    return ImageContent;
}(Content));
exports.ImageContent = ImageContent;
// 请求接口
function SdkGet(action, params, suc, error) {
    var clz = model_1.Base.Impl.models["Null"];
    var m = new clz();
    m.action = action;
    m.additionParams = params;
    session_1.Session.Fetch(m, function () {
        var data = m.data;
        suc(data);
    }, function (err) {
        error && error(err);
    });
}
exports.SdkGet = SdkGet;
function SdkPost(action, params, files, medias, suc, error) {
    var clz = model_1.Base.Impl.models["Null"];
    var m = new clz();
    m.action = action;
    m.method = model_1.HttpMethod.POST;
    m.additionParams = params;
    m.additionFiles = files;
    m.additionMedias = medias;
    session_1.Session.Fetch(m, function () {
        var data = m.data;
        suc(data);
    }, function (err) {
        error && error(err);
    });
}
exports.SdkPost = SdkPost;
