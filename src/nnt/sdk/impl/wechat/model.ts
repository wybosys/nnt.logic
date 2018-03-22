// 微信登陆方式
import {array, input, integer, json, model, optional, output, string, string_t, type} from "../../../core/proto";
import {Base, IResponseData, RequestParams} from "../../../session/model";
import {logger} from "../../../core/logger";
import {colarray, colinteger, colstring, table} from "../../../store/proto";
import {SdkUserInfo, Support} from "../../msdk";

export enum AuthType {
    PUB = 1, // 公众号授权
    QRCODE = 2, // 扫码授权
    NATIVE = 3 // SDK本地授权
}

// 微信接入
@model()
export abstract class WechatModel extends Base {

    parseData(resp: IResponseData, suc: () => void, error: (err: Error) => void) {
        let data = resp.data;
        if (data.errcode) {
            resp.code = -data.errcode;
            resp.data = null;
            resp.message = data.errmsg;
            logger.warn("微信：" + resp.message);
        }
        else {
            resp.code = 0;
            resp.data = data;
        }
        super.parseData(resp, suc, error);
    }
}

// 拉取个人信息
@table("", "wechat_userprofiles")
@model()
export class WechatUserProfile extends WechatModel {

    requestUrl(): string {
        return "https://api.weixin.qq.com/sns/userinfo?";
    }

    @string(1, [input])
    access_token: string;

    @string(2, [input])
    @colstring()
    openid: string;

    @string(3, [output])
    @colstring()
    nickname: string;

    @integer(4, [output])
    @colinteger()
    sex: number;

    @string(5, [output])
    @colstring()
    province: string;

    @string(6, [output])
    @colstring()
    city: string;

    @string(7, [output])
    @colstring()
    country: string;

    @string(8, [output])
    @colstring()
    headimgurl: string;

    @array(9, string_t, [output])
    @colarray(string_t)
    privilege: string;

    @string(10, [output])
    @colstring()
    unionid: string;

    @type(11, SdkUserInfo, [output])
    info: SdkUserInfo;

    @string(12, [input, optional])
    lang = "zh_CN";
}

// 通过code登陆
@model()
export class WechatLogin {

    @string(1, [input])
    authcode: string;

    @string(2, [output])
    oid: string; // other id

    @type(3, SdkUserInfo, [output])
    info: SdkUserInfo;

    @json(4, [input, optional])
    support: Support;
}

// 通过code请求token的模型
@model()
@table("", "wechat_tokens")
export class WechatToken extends WechatModel {

    requestUrl(): string {
        return "https://api.weixin.qq.com/sns/oauth2/access_token?";
    }

    requestParams(): RequestParams {
        let rp = new RequestParams();
        rp.fields = {
            appid: this.appid,
            secret: this.appsecret,
            code: this.authcode,
            grant_type: "authorization_code"
        };
        return rp;
    }

    @string(1, [input, optional])
    appid: string;

    @string(2, [input, optional])
    appsecret: string;

    @string(3, [input])
    authcode: string;

    @string(4, [output])
    @colstring()
    access_token: string;

    @integer(5, [output])
    expires_in: number;

    @string(6, [output])
    @colstring()
    refresh_token: string;

    @string(7, [output])
    @colstring()
    openid: string;

    @string(8, [output])
    scope: string;

    @string(9, [output])
    @colstring()
    unionid: string;

    @colarray(string_t)
    scopes: string[];

    @colinteger() // 整体过期的时间(refreshtoken过期时间)
    expiretime: number;

    @colinteger() // accesstoken过期的时间
    accesstime: number;

    @colinteger()
    authtype: AuthType; // 授权方式

    @colstring()
    ticket: string;
}

// 刷新token
@model()
export class WechatRefreshToken extends WechatModel {

    requestUrl(): string {
        return "https://api.weixin.qq.com/sns/oauth2/refresh_token?";
    }

    requestParams(): RequestParams {
        let rp = new RequestParams();
        rp.fields = {
            appid: this.appid,
            grant_type: "refresh_token",
            refresh_token: this.refresh_token
        };
        return rp;
    }

    @string(1, [input, optional])
    appid: string;

    @string(2, [input, output])
    refresh_token: string;

    @string(3, [output])
    access_token: string;

    @string(4, [output])
    expires_in: number;

    @string(5, [output])
    openid: string;

    @string(6, [output])
    scope: string;
}
