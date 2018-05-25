import url = require("url");
import {Channel} from "../../channel";
import {RegisterChannel, Sdk} from "../../sdk";
import {
    AsyncArray,
    IndexedObject,
    make_tuple,
    ObjectT,
    Random,
    StringT,
    toJson,
    toJsonObject
} from "../../../core/kernel";
import {
    Auth,
    CompletePay,
    Environment,
    GetRemoteMedia,
    Info,
    Login,
    LoginMethod,
    Pay,
    PayMethod,
    SdkUserInfo,
    Share,
    Support
} from "../../msdk";
import {Fast} from "../../../component/encode";
import {AuthType, WechatRefreshToken, WechatToken, WechatUserProfile} from "./model";
import {RestSession} from "../../../session/rest";
import {DateTime} from "../../../core/time";
import {Insert, Query, QueryOne, UpdateOne} from "../../../manager/dbmss";
import {GetInnerId, Output} from "../../../store/proto";
import {Call} from "../../../manager/servers";
import {NonceAlDig} from "../../../component/nonce";
import {Format, StringDigest} from "../../../core/string";
import {Transaction} from "../../../server/transaction";
import {WechatPayResult, WechatUnifiedOrder} from "./paymodel";
import {Decode, Encode, Output as ApiOutput} from "../../../core/proto";
import {STATUS} from "../../../core/models";
import {logger} from "../../../core/logger";
import {S2SWechatTicket, S2SWechatToken} from "./s2smodel";
import {ACROOT} from "../../../acl/acl";
import {AudioSupport} from "../../../server/audiostore";

export class Wechat extends Channel {

    constructor(sdk: Sdk) {
        super(sdk);
    }

    config(c: IndexedObject): boolean {
        if (!c.appid ||
            !c.appsecret ||
            !c.redirecturl)
            return false;
        this.appid = c.appid;
        this.appsecret = c.appsecret;
        this.redirecturl = c.redirecturl;
        this.pubid = c.pubid;
        this.pubsecret = c.pubsecret;
        this.pubmchid = c.pubmchid;
        this.pubkey = c.pubkey;
        this.nativeid = c.nativeid;
        this.nativesecret = c.nativesecret;
        this.payid = c.payid;
        this.paykey = c.paykey;
        this.paymchid = c.paymchid;
        this.noticeurl = c.noticeurl;
        return true;
    }

    // 网站应用申请的
    appid: string;
    appsecret: string;
    redirecturl: string;

    // 公众号参数申请的
    pubid: string;
    pubsecret: string;
    pubmchid: string;
    pubkey: string;

    // 原生应用接入申请的
    nativeid: string;
    nativesecret: string;

    // 支付相关
    payid: string;
    paykey: string;
    paymchid: string;
    noticeurl: string; // 支付成功后的回调地址

    // 加密
    private _fast = new Fast("ljre39&*");

    // 获得token
    protected async doReqToken(authcode: string, appid: string, appsecret: string, authtype: AuthType): Promise<WechatToken> {
        logger.log("微信：用户授权通过，获取 token");

        let m = new WechatToken();
        m.authcode = authcode;
        m.appid = appid ? appid : this.appid;
        m.appsecret = appsecret ? appsecret : this.appsecret;
        m = await RestSession.Get(m);
        if (!m) {
            logger.log("微信：用户授权通过，获取 token 失败");
            return null;
        }

        // 转换数据
        m.scopes = m.scope.split(",");

        // 纪录过期时间
        let now = DateTime.Current();
        m.accesstime = now + m.expires_in;
        m.expiretime = now + DateTime.MONTH;
        m.authtype = authtype;

        // 保存token
        await UpdateOne(make_tuple(this._sdk.dbsrv, WechatToken),
            null,
            [{unionid: m.unionid},
                {$set: Output(m)},
                {upsert: true}]);
        return m;
    }

    // 获得玩家信息
    protected async doReqProfile(access: string, openid: string): Promise<WechatUserProfile> {
        logger.log("微信：获取用户信息 " + openid);
        let m = new WechatUserProfile();
        m.access_token = access;
        m.openid = openid;
        m = await RestSession.Get(m);
        if (!m) {
            logger.log("微信：获取用户信息 " + openid + " 失败");
            return null;
        }

        // 添加到微信用户数据表
        UpdateOne(make_tuple(this._sdk.dbsrv, WechatUserProfile),
            null,
            [{unionid: m.unionid},
                {$set: Output(m)},
                {upsert: true}]);

        // 使用图片服务器抓取头像
        let t = await Call(this._sdk.imgsrv, "imagestore.download", {
            source: m.headimgurl
        });

        // 转换成sdk
        let ui = new SdkUserInfo();
        ui.channel = "wechat";
        ui.userid = m.unionid;
        ui.deviceid = m.openid;
        ui.nickname = m.nickname;
        ui.sex = m.sex;
        ui.avatar = t.model.path;
        m.info = ui;
        return m;
    }

    // 生成授权登陆的页面
    authurl(state: string, method: LoginMethod): string {
        let r: string;
        if (method == LoginMethod.WECHAT_PUB) {
            // 微信公众号登陆
            r = "https://open.weixin.qq.com/connect/oauth2/authorize?";
            r += "appid=" + this.pubid;
            r += "&redirect_uri=" + encodeURIComponent(this.redirecturl);
            r += "&response_type=code";
            r += "&scope=snsapi_userinfo";
            r += "&state=" + state;
            r += "#wechat_redirect";
        }
        else if (method == LoginMethod.WECHAT_APP) {
            r = "https://localhost/?&state=" + state;
        }
        else {
            // 微信扫码登陆
            r = "https://open.weixin.qq.com/connect/qrconnect?";
            r += "appid=" + this.appid;
            r += "&redirect_uri=" + encodeURIComponent(this.redirecturl);
            r += "&response_type=code";
            r += "&scope=snsapi_login";
            r += "&state=" + state;
            r += "#wechat_redirect";
        }
        return r;
    }

    async doInfo(m: Info, sp: Support): Promise<void> {
        // 判断微信第二次刷新页面需要处理code等数据
        if (m.url) {
            let q = <IndexedObject>url.parse(m.url, true).query;
            let code = q["code"];
            let state = q["state"];
            if (code && state) {
                let obj: any = this._fast.decode(state);
                obj = toJsonObject(obj);
                if (obj) {
                    if (obj.wechat)
                        m.payload.wechatcode = code;
                    m.payload.login = obj.login;
                }
            }
        }
    }

    async doAuth(m: Auth): Promise<boolean> {
        let pl = m.payload;
        if (pl && pl.wechatcode) {
            // 则是微信登陆成功的回调页面
            let authcode = m.payload.wechatcode;
            // 登陆微信
            let appid: string;
            let appsec: string;
            let authtype: AuthType;
            if (m.method == LoginMethod.WECHAT_PUB) {
                appid = this.pubid;
                appsec = this.pubsecret;
                authtype = AuthType.PUB;
            }
            else if (m.method == LoginMethod.WECHAT_QRCODE) {
                appid = this.appid;
                appsec = this.appsecret;
                authtype = AuthType.QRCODE;
            }
            else {
                appid = this.nativeid;
                appsec = this.nativesecret;
                authtype = AuthType.NATIVE;
            }

            // 请求token
            let lg = await this.doReqToken(authcode, appid, appsec, authtype);
            if (lg) {
                // 请求个人信息
                let pf = await this.doReqProfile(lg.access_token, lg.openid);
                if (pf) {
                    // 插入到数据库中
                    let r = await UpdateOne(make_tuple(this._sdk.dbsrv, SdkUserInfo), null, [
                        // 从openid修改成unionid
                        {oid: lg.unionid},
                        {$set: pf.info},
                        {upsert: true}]);
                    m.uid = GetInnerId(r);
                    return true;
                }
            }
            // 否则走重新授权的流程
        }

        // 生成微信授权访问的页面跳转
        // 查找微信服务的定义，取出数据生成访问url
        let salt = Random.Rangei(0, 1000);
        m.targeturl = this.authurl(this._fast.encode(toJson({wechat: salt, login: m.method})), m.method);

        return true;
    }

    async doLogin(m: Login, ui: SdkUserInfo): Promise<boolean> {
        return true;
    }

    async doCheckExpire(ui: SdkUserInfo): Promise<boolean> {
        let rcd = await Query(make_tuple(this._sdk.dbsrv, WechatToken), {
            unionid: ui.userid,
            openid: ui.deviceid,
            expiretime: {$gt: DateTime.Now() + DateTime.MINUTE_5}
        });
        if (!rcd) {
            logger.log("微信：" + ui.userid + " 授权过期");
            return false;
        }
        return true;
    }

    async doRenewal(ui: SdkUserInfo): Promise<boolean> {
        let rcd = await QueryOne(make_tuple(this._sdk.dbsrv, WechatToken), {
            unionid: ui.userid,
            openid: ui.deviceid
        });
        if (!rcd)
            return false;
        let token = await this.renewalToken(rcd);
        return token != null;
    }

    protected async renewalToken(rcd: WechatToken): Promise<WechatToken> {
        logger.log("微信：" + rcd.unionid + " 刷新 accesstoken");
        let m = new WechatRefreshToken();
        m.appid = this.getAppid(rcd.authtype);
        m.refresh_token = rcd.refresh_token;
        m = await RestSession.Get(m);
        if (!m) {
            logger.log("微信：" + rcd.unionid + " 刷新 accesstoken 失败");
            return null;
        }
        rcd.access_token = m.access_token;
        rcd.refresh_token = m.refresh_token;
        rcd.openid = m.openid;
        rcd.expires_in = m.expires_in;
        rcd.scope = m.scope;
        rcd.scopes = m.scope.split(",");
        rcd.accesstime = DateTime.Current() + m.expires_in;
        return UpdateOne(make_tuple(this._sdk.dbsrv, WechatToken),
            GetInnerId(rcd),
            {$set: Output(rcd)});
    }

    protected async renewalS2SToken(appid: string, appsecret: string): Promise<S2SWechatToken> {
        logger.log("微信：" + appid + " 刷新服务端 accesstoken");
        let m = new S2SWechatToken();
        m.appid = appid;
        m.appsecret = appsecret;
        m = await RestSession.Get(m);
        if (!m) {
            logger.log("微信：" + appid + " 刷新服务端 accesstoken 失败");
            return null;
        }
        return UpdateOne(make_tuple(this._sdk.dbsrv, S2SWechatToken), null, [{
            appid: appid
        }, {
            $set: {
                access_token: m.access_token,
                accesstime: DateTime.Current() + m.expires_in
            }
        }, {upsert: true}]);
    }

    // 获得可用的accesstoken
    async doGetAccessToken(userid: string, deviceid: string): Promise<string> {
        logger.log("微信：" + userid + " 查找 accesstoken");
        let tk = await QueryOne(make_tuple(this._sdk.dbsrv, WechatToken), {
            unionid: userid,
            openid: deviceid
        });
        if (!tk) {
            logger.log("微信：" + userid + " 查找 accesstoken 失败");
            return null;
        }
        if (tk.accesstime >= DateTime.Current() + DateTime.MINUTE)
            return tk.access_token;
        tk = await this.renewalToken(tk);
        return tk ? tk.access_token : null;
    }

    // 获取服务端的accesstoken
    async doGetS2SAccessToken(appid: string, appsecret: string): Promise<string> {
        logger.log("微信：" + appid + " 查找服务端 accesstoken");
        let tk = await QueryOne(make_tuple(this._sdk.dbsrv, S2SWechatToken), {
            appid: appid
        });
        if (!tk) {
            // 刷新token
            tk = await this.renewalS2SToken(appid, appsecret);
            if (!tk) {
                logger.log("微信：" + appid + " 查找服务端 accesstoken 失败");
                return null;
            }
        }
        if (tk.accesstime >= DateTime.Current() + DateTime.MINUTE)
            return tk.access_token;
        logger.log("微信：" + appid + "服务端 accesstoken 过期");
        tk = await this.renewalS2SToken(appid, appsecret);
        return tk ? tk.access_token : null;
    }

    // 保证可用
    async doGetTicket(appid: string, appsecret: string): Promise<S2SWechatTicket> {
        logger.log("微信：" + appid + " 请求 ticket");
        let type = "jsapi";
        let rcd = await QueryOne(make_tuple(this._sdk.dbsrv, S2SWechatTicket), {
            appid: appid,
            type: type,
            expiretime: {$gt: DateTime.Now()}
        });
        if (rcd)
            return rcd;

        // 重新请求ticket
        let accesstoken = await this.doGetS2SAccessToken(appid, appsecret);
        if (!accesstoken)
            return null;

        // 需要重新请求
        let m = new S2SWechatTicket();
        m.access_token = accesstoken;
        m.type = type;
        m = await RestSession.Get(m);
        if (!m) {
            logger.log("微信：" + appid + " 请求服务端 ticket 失败");
            return null;
        }
        m.expiretime = DateTime.Current() + m.expires_in;
        m.appid = appid;
        await UpdateOne(make_tuple(this._sdk.dbsrv, S2SWechatTicket), null, [{
            appid: appid,
            type: type
        }, {$set: Output(m)},
            {upsert: true}]);
        return m;
    }

    async doEnvironment(env: Environment, ui?: SdkUserInfo): Promise<boolean> {
        // 初始化jssdk的配置参数
        let cfg = await this.doMakeJSAPIConfig(env);
        if (!cfg)
            return false;
        env.payload.wechat_jsapicfg = cfg;
        return true;
    }

    // https://mp.weixin.qq.com/wiki?t=resource/res_main&id=mp1421141115
    protected async doMakeJSAPIConfig(env: Environment): Promise<IndexedObject> {
        let ticket = await this.doGetTicket(
            this.getAppid(AuthType.PUB),
            this.getAppSecret(AuthType.PUB)
        );
        if (!ticket)
            return null;

        let r: IndexedObject = {
            debug: false,
            appId: this.pubid,
            timestamp: DateTime.Current(),
            nonceStr: NonceAlDig(10),
            jsApiList: WECHAT_JSAPIS
        };

        let ps: IndexedObject = {};
        ps.jsapi_ticket = ticket.ticket;
        ps.timestamp = r.timestamp;
        ps.noncestr = r.nonceStr;

        // 参与签名的字段包括有效的 jsapi_ticket（获取方式详见微信 JSSDK 文档）， noncestr （随机字符串，由开发者随机生成），timestamp （由开发者生成的当前时间戳）， url（当前网页的URL，不包含#及其后面部分。注意：对于没有只有域名没有 path 的 URL ，浏览器会自动加上 / 作为 path，如打开 http://qq.com 则获取到的 URL 为 http://qq.com/
        ps.url = StringT.Split(env.href, "#")[0];

        // 合并成字符串用来加密
        let strs = new Array();
        let map = ObjectT.ToMap(ps);
        map.forEach((v, k) => {
            strs.push(k + "=" + v);
        });

        let plain = strs.join("&");
        r.signature = StringDigest.SHA1(plain, Format.HEX);

        logger.log("微信：JSAPI配置参数 " + toJson(r) + " 签名原文 " + plain);
        return r;
    }

    async doShare(sa: Share, ui: SdkUserInfo): Promise<boolean> {
        // 如果是ICON分享，则需要返回初始化微信分享用的数据
        return true;
    }

    async doPay(m: Pay, ui: SdkUserInfo, trans: Transaction): Promise<boolean> {
        let wuo = new WechatUnifiedOrder();
        wuo.nonce_str = NonceAlDig(10);

        //wuo.sign
        wuo.body = m.desc;
        wuo.out_trade_no = m.orderid;
        wuo.total_fee = m.price; // 正式的价格
        wuo.spbill_create_ip = trans.info.addr;
        wuo.notify_url = this.noticeurl + "/method/" + m.method + "/channel/wechat"; // 会变成参数传递给completePay接口，用来判断是哪个渠道发来的回调

        if (m.method == PayMethod.WECHAT_PUB) {
            wuo.appid = this.pubid;
            wuo.mch_id = this.pubmchid;
            wuo.signkey = this.pubkey;
            wuo.openid = ui.deviceid;
            wuo.trade_type = "JSAPI";
        }
        else if (m.method == PayMethod.WECHAT_QRCODE) {
            wuo.appid = this.pubid;
            wuo.mch_id = this.pubmchid;
            wuo.signkey = this.pubkey;
            wuo.trade_type = "NATIVE";
        }
        else if (m.method == PayMethod.WECHAT_H5) {
            wuo.trade_type = "MWEB";
        }
        else {
            wuo.appid = this.payid;
            wuo.mch_id = this.paymchid;
            wuo.signkey = this.paykey;
            wuo.trade_type = "APP";
        }

        // 计算签名
        let fields = ObjectT.ToMap(Encode(wuo));
        wuo.sign = this.doSignaturePay(fields, wuo.signkey);
        wuo.created = DateTime.Now();

        let res = await RestSession.Get(wuo);
        if (!res) {
            wuo.success = false;
            Insert(make_tuple(this._sdk.dbsrv, WechatUnifiedOrder), Output(wuo));
            return false;
        }

        // 微信的每种方式产生的payload格式是不一样的
        if (m.method == PayMethod.WECHAT_PUB) {
            m.payload = {
                appId: this.pubid,
                timeStamp: DateTime.Current().toString(),
                nonceStr: NonceAlDig(10),
                package: "prepay_id=" + res.prepay_id,
                signType: "MD5"
            };
            fields = ObjectT.ToMap(m.payload);
            m.payload.paySign = this.doSignaturePay(fields, wuo.signkey);
        }
        else if (m.method == PayMethod.WECHAT_QRCODE) {
            // 二维码需要包含的链接
            m.payload = {
                url: res.code_url
            };
        }
        else if (m.method == PayMethod.WECHAT_H5) {
            m.payload = {
                url: res.mweb_url
            };
        }
        else {
            // 组装返回的数据
            m.payload = {
                appid: this.payid,
                partnerid: this.paymchid,
                prepayid: res.prepay_id,
                package: "Sign=WXPay",
                noncestr: NonceAlDig(10),
                timestamp: DateTime.Current()
            };
            fields = ObjectT.ToMap(m.payload);
            m.payload.sign = this.doSignaturePay(fields, wuo.signkey);
        }

        // 保存纪录
        res.success = true;
        Insert(make_tuple(this._sdk.dbsrv, WechatUnifiedOrder), Output(res));

        return true;
    }

    protected doSignaturePay(fields: Map<string, any>, key: string): string {
        let argus = new Array();
        fields.forEach((v, k) => {
            argus.push(k + "=" + v);
        });
        argus.push("key=" + key);
        let plain = argus.join("&");
        let sign = StringDigest.MD5(plain, Format.HEX).toUpperCase();
        return sign;
    }

    async doCompletePay(m: CompletePay, trans: Transaction): Promise<boolean> {
        // 重建数据模型
        let wpr = new WechatPayResult();
        Decode(wpr, trans.params);

        // 构造应答数据，由业务层应答
        m.respn = {
            contentType: "text/xml",
            content: "<xml><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[OK]]></return_msg></xml>"
        };

        // 判断微信发过来的支持情况
        if (wpr.result_code != "SUCCESS") {
            wpr.status = STATUS.FAILED;
            Insert(make_tuple(this._sdk.dbsrv, WechatPayResult), wpr);
            return false;
        }

        let signkey: string;
        if (m.method == PayMethod.WECHAT_PUB) {
            signkey = this.pubkey;
        }
        else {
            signkey = this.paykey;
        }

        // 验证微信发起的签名
        let fields = ObjectT.ToMap(ApiOutput(wpr));
        let sign = this.doSignaturePay(fields, signkey);
        if (sign != wpr.sign) {
            wpr.status = STATUS.SIGNATURE_ERROR;
            Insert(make_tuple(this._sdk.dbsrv, WechatPayResult), wpr);
            return false;
        }

        wpr.status = STATUS.OK;
        Insert(make_tuple(this._sdk.dbsrv, WechatPayResult), wpr);

        // 查询该订单的价格是否一致
        let rcd = await QueryOne(make_tuple(this._sdk.dbsrv, Pay), {
            orderid: wpr.out_trade_no
        });
        if (!rcd) {
            logger.log("没有查找到该微信订单 " + wpr.out_trade_no);
            return false;
        }

        if (wpr.cash_fee != rcd.price) {
            logger.log("支付的金额和下单的金额不一致 " + wpr.out_trade_no);
            return false;
        }

        // 支付成功
        m.orderid = wpr.out_trade_no;

        // 签名成功
        return true;
    }

    protected getAppid(at: AuthType): string {
        if (at == AuthType.PUB)
            return this.pubid;
        if (at == AuthType.QRCODE)
            return this.appid;
        return this.nativeid;
    }

    protected getAppSecret(at: AuthType): string {
        if (at == AuthType.PUB)
            return this.pubsecret;
        if (at == AuthType.QRCODE)
            return this.appsecret;
        return this.nativesecret;
    }

    async doRemoteImages(m: GetRemoteMedia, ui?: SdkUserInfo): Promise<void> {
        let tk = await this.doGetS2SAccessToken(
            this.getAppid(AuthType.PUB),
            this.getAppSecret(AuthType.PUB)
        );
        if (!tk)
            return;
        logger.log("微信：下载远程图片 " + toJson(m));
        m.paths = await (AsyncArray(m.medias).convert<string>((e, done) => {
            let url = "https://api.weixin.qq.com/cgi-bin/media/get?access_token=" + tk + "&media_id=" + e;
            // 下载图片
            Call(this._sdk.imgsrv, "imagestore.download", {
                source: url
            }, ACROOT).then(t => {
                done(t.model.path);
            });
        }));
    }

    async doRemoteAudios(m: GetRemoteMedia, ui?: SdkUserInfo): Promise<void> {
        let tk = await this.doGetS2SAccessToken(
            this.getAppid(AuthType.PUB),
            this.getAppSecret(AuthType.PUB)
        );
        if (!tk)
            return;
        logger.log("微信：下载远程音频 " + toJson(m));
        m.paths = await (AsyncArray(m.medias).convert<string>((e, done) => {
            let url = "https://api.weixin.qq.com/cgi-bin/media/get?access_token=" + tk + "&media_id=" + e;
            // 下载图片
            Call(this._sdk.mediasrv, "audiostore.download", {
                source: url,
                type: AudioSupport.AMR
            }, ACROOT).then(t => {
                done(t.model.path);
            });
        }));
    }
}

RegisterChannel("wechat", Wechat);

// FEATURE对应api的列表
const WECHAT_JSAPIS = [

    // 分享
    "onMenuShareTimeline",
    "onMenuShareAppMessage",
    "onMenuShareQQ",
    "onMenuShareWeibo",
    "onMenuShareQZone",

    // 录音
    "startRecord",
    "stopRecord",
    "onVoiceRecordEnd",
    "playVoice",
    "pauseVoice",
    "stopVoice",
    "onVoicePlayEnd",
    "uploadVoice",
    "downloadVoice",

    // 图片相关
    "chooseImage",
    "previewImage",
    "uploadImage",
    "downloadImage"
];
