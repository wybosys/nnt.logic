import {AbstractServer} from "../../server/server";
import {Node} from "../../config/config";
import {static_cast} from "../../core/core";
import {logger} from "../../core/logger";
import {expose} from "../../core/router";
import {Decode, input, integer, model, output, string, string_t, type} from "../../core/proto";
import {Fetch} from "../../server/remote";
import {IndexedObject} from "../../core/kernel";

interface SdksConfig {

    // 连接debug服务
    debug: boolean;

    // 游戏id
    gameid: number;

    // 游戏key
    gamekey: string;

    // 是否为微信版
    wechat: boolean;

    // 绑定到服务来测试
    attach: string;
}

@model()
export class SdkAdminInfo {

}

@model()
export class SdkMerchantInfo {

}

@model()
export class SdkUserInfo {

    @string(1, [output])
    userid: string;

    @string(2, [output])
    nickname: String;

    @integer(3, [output])
    gender: number;

    @string(4, [output])
    avatar: string;
}

@model()
export class SdkUserLogin {

    @string(1, [input], "sdks返回的原始数据")
    raw: string;

    @string(2, [input], "channel渠道")
    channel: string;

    @type(3, SdkUserInfo, [output], "用户信息")
    user: SdkUserInfo;

    @string(4, [output], "sid")
    sid: string;
}

@model()
export class SdkUserVerify {

    @string(1, [input], "sid")
    sid: string;
}

@model()
export class SdkAdminVerify {

    @string(1, [input], "sid")
    sid: string;
}

@model()
export class SdkMerchantVerify {

    @string(1, [input], "sid")
    sid: string;
}

@model()
export class SdkRecharge {

    @string(1, [input], "uid")
    uid: string;

    @string(2, [input], "渠道")
    channel: string;

    @string(3, [input, output], "渠道支付的原始数据")
    raw: string | IndexedObject;

    @string(4, [output], "orderid")
    orderid: string;
}

export class Sdks extends AbstractServer {

    config(cfg: Node): boolean {
        if (!super.config(cfg))
            return false;
        let c = static_cast<SdksConfig>(cfg);
        if (!c.gameid || !c.gamekey)
            return false;

        if (c.wechat) {
            this.host = "https://wxgames.91yigame.com";
        } else {
            if (c.debug) {
                this.host = "http://develop.91egame.com";
            } else {
                this.host = "https://www.91yigame.com";
            }
        }
        this.open = this.host + "/platform/open";
        this.admins = this.host + "/platform/admins";
        this.users = this.host + "/platform/users";
        this.merchants = this.host + "/platform/merchants";

        this.gameid = c.gameid;
        this.gamekey = c.gamekey;
        this.attach = c.attach;
        return true;
    }

    host: string;
    open: string;
    admins: string;
    users: string;
    merchants: string;

    gameid: number;
    gamekey: string;
    attach: string;

    async start() {
        logger.info("连接 {{=it.id}}@sdks", {id: this.id});
        if (this.attach) {
            //let srv = static_cast<IRouterable>(Find(this.attach));
        }
    }

    async stop() {
        // pass
    }

    // 获取管理员信息
    async adminVerify(m: SdkAdminVerify): Promise<SdkAdminInfo> {
        try {
            let ret = await Fetch(this.admins, {
                action: 'app.info',
                _sid: m.sid
            });
            return Decode(new SdkAdminInfo(), ret.user, false, true);
        } catch (err) {
            throw err;
        }
    }

    // 商户信息
    async merchantVerify(m: SdkMerchantVerify): Promise<SdkMerchantInfo> {
        try {
            let ret = await Fetch(this.admins, {
                action: 'app.info',
                _sid: m.sid
            });
            return Decode(new SdkMerchantInfo(), ret.user, false, true);
        } catch (err) {
            throw err;
        }
    }

    // 普通用户登录
    async userLogin(m: SdkUserLogin): Promise<SdkUserLogin> {
        try {
            let ret = await Fetch(this.open, {
                action: 'user.login',
                raw: m.raw,
                channel: m.channel
            });
            m.user = Decode(new SdkUserInfo(), ret.user, false, true);
            m.sid = ret.sid;
            return m;
        } catch (err) {
            throw err
        }
    }

    // 获取普通用户信息
    async userVerify(m: SdkUserVerify): Promise<SdkUserInfo> {
        try {
            let ret = await Fetch(this.users, {
                action: 'user.info',
                _sid: m.sid
            });
            return Decode(new SdkUserInfo(), ret.user, false, true);
        } catch (err) {
            throw err;
        }
    }

    // 获取支付信息
    async rechargeInfo(m: SdkRecharge): Promise<SdkRecharge> {
        try {
            let ret = await Fetch(this.open, {
                action: 'shop.rechargeinfo',
                raw: m.raw,
                channel: m.channel
            });
            m.orderid = ret.orderid;
            m.raw = ret.raw;
            return m;
        } catch (err) {
            throw err
        }
    }
}
