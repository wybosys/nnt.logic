import {AbstractServer} from "../../server/server";
import {Node} from "../../config/config";
import {static_cast} from "../../core/core";
import {logger} from "../../core/logger";
import {Decode, input, integer, json, model, optional, output, string, string_t, type} from "../../core/proto";
import {Fetch, Call} from "../../server/remote";
import {ArrayT, IndexedObject} from "../../core/kernel";

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
    nickname: string;

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

    @integer(3, [input], "分")
    money: number;

    @string(4, [output], "渠道支付的原始数据")
    raw: string | IndexedObject;

    @string(5, [output], "orderid")
    orderid: string;
}

@model()
export class SdkReport {

    @string(1, [input, optional])
    uid: string;

    @string(2, [input, optional])
    channelid: string;

    @string(3, [input])
    type: string;

    @json(4, [input])
    data: IndexedObject;
}

@model()
export class SdkExchangableItem {

    @string(1, [output])
    itemid: string;

    @string(2, [output])
    brand: string;

    @string(3, [output])
    color: string;

    @integer(4, [output])
    price: number;

    @integer(5, [output])
    inventory: number;

    @string(6, [output])
    images: string;

    @string(7, [output])
    thumb: string;
}

@model()
export class SdkExchangeItem {

    @string(1, [input])
    userid: string;

    @string(2, [input])
    itemid: string;

    @string(3, [input])
    channelid: string;

    @string(4, [input])
    mobile: string;

    @string(5, [input])
    address: string;

    @string(6, [input])
    receiver: string;
}

@model()
export class SdkRechargeItem {

    @string(1, [output], "商品id")
    itemid: string;

    @string(2, [input])
    channelid: string;

    @string(3, [input, optional])
    userid: string;

    @integer(4, [output], "价格，单位为分")
    price: number;
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
                this.host = "https://apps.91yigame.com";
            }
        }
        this.open = this.host + "/platform/open";
        this.admins = this.host + "/platform/admins";
        this.users = this.host + "/platform/users";
        this.merchants = this.host + "/platform/merchants";
        this.bi = this.host + "/platform/bi";
        this.shops = this.host + "/platform/shops";
        this.games = this.host + "/platform/games";

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
    bi: string;
    shops: string;
    games: string;

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
        let ret = await Fetch(this.admins, {
            action: 'app.info',
            _sid: m.sid
        });
        return Decode(new SdkAdminInfo(), ret.user, false, true);
    }

    // 商户信息
    async merchantVerify(m: SdkMerchantVerify): Promise<SdkMerchantInfo> {
        let ret = await Fetch(this.admins, {
            action: 'app.info',
            _sid: m.sid
        });
        return Decode(new SdkMerchantInfo(), ret.user, false, true);
    }

    // 普通用户登录
    async userLogin(m: SdkUserLogin): Promise<SdkUserLogin> {
        let ret = await Fetch(this.open, {
            action: 'user.login',
            raw: m.raw,
            channel: m.channel
        });
        m.user = Decode(new SdkUserInfo(), ret.user, false, true);
        m.sid = ret.sid;
        return m;
    }

    // 获取普通用户信息
    async userVerify(m: SdkUserVerify): Promise<SdkUserInfo> {
        let ret = await Fetch(this.users, {
            action: 'user.info',
            _sid: m.sid
        });
        return Decode(new SdkUserInfo(), ret.user, false, true);
    }

    // 获取支付信息
    async rechargeInfo(m: SdkRecharge): Promise<SdkRecharge> {
        let ret = await Fetch(this.open, {
            action: 'shop.rechargeinfo',
            money: m.money,
            channel: m.channel,
            gameid: this.gameid,
            uid: m.uid
        });
        m.orderid = ret.orderid;
        m.raw = ret.raw;
        return m;
    }

    // 汇报数据
    async report(m: SdkReport): Promise<void> {
        Call(this.bi, {
            action: 'bi.report',
            gameid: this.gameid,
            uid: m.uid,
            channelid: m.channelid,
            type: m.type,
            data: m.data
        });
    }

    // 兑换商品列表
    async exchangableItems(channelid: string, pagecount = 999, page = 1): Promise<SdkExchangableItem[]> {
        let ret = await Fetch(this.shops, {
            action: 'items.lists',
            count: pagecount,
            page: page,
            channelid: channelid,
            gameid: this.gameid,
        });
        return ArrayT.Convert(ret.info, e => {
            let t = new SdkExchangableItem();
            Decode(t, e, false, true);
            return t;
        });
    }

    // 兑换商品
    async exchange(m: SdkExchangeItem): Promise<void> {
        await Fetch(this.shops, {
            action: 'items.exchange',
            userid: m.userid,
            itemid: m.itemid,
            channelid: m.channelid,
            mobile: m.mobile,
            address: m.address,
            receiver: m.receiver,
            gameid: this.gameid,
        });
    }

    // 虚拟道具列表
    async rechargableItems(channelid: string, pagecount = 999, page = 1): Promise<SdkRechargeItem[]> {
        let ret = await Fetch(this.games, {
            action: 'recharge.lists',
            count: pagecount,
            page: page,
            channelid: channelid,
            gameid: this.gameid,
        });
        return ArrayT.Convert(ret.info, e => {
            let t = new SdkRechargeItem();
            Decode(t, e, false, true);
            return t;
        });
    }
}
