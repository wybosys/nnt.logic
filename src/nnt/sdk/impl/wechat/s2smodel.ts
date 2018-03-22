import {input, integer, model, optional, output, string} from "../../../core/proto";
import {colinteger, colstring, table} from "../../../store/proto";
import {WechatModel} from "./model";
import {RequestParams} from "../../../session/model";

@model()
@table("", "wechat_s2s_tokens")
export class S2SWechatToken extends WechatModel {

    requestUrl(): string {
        return "https://api.weixin.qq.com/cgi-bin/token?";
    }

    requestParams(): RequestParams {
        let rp = new RequestParams();
        rp.fields = {
            appid: this.appid,
            secret: this.appsecret,
            grant_type: "client_credential"
        };
        return rp;
    }

    @string(1, [input, optional])
    @colstring()
    appid: string;

    @string(2, [input, optional])
    appsecret: string;

    @string(3, [output])
    @colstring()
    access_token: string;

    @integer(5, [output])
    expires_in: number;

    @colinteger() // accesstoken过期的时间
    accesstime: number;
}

@model()
@table("", "wechat_s2s_tickets")
export class S2SWechatTicket extends WechatModel {

    requestUrl(): string {
        return "https://api.weixin.qq.com/cgi-bin/ticket/getticket?";
    }

    requestParams(): RequestParams {
        let rp = new RequestParams();
        rp.fields = {
            access_token: this.access_token,
            type: this.type
        };
        return rp;
    }

    @string(1, [input])
    access_token: string;

    @colstring()
    appid: string;

    @string(2, [input])
    @colstring() // 获取ticket的模块
    type: string;

    @string(3, [output])
    @colstring()
    ticket: string;

    @colinteger()
    expiretime: number;

    @integer(4, [output])
    expires_in: number;
}
