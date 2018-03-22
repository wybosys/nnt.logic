import {
    array, file, input, integer, integer_t, json, model, optional, output, string, string_t,
    type
} from "../core/proto";
import {ArrayT, IndexedObject, MAX_INT} from "../core/kernel";
import {colinteger, coljson, colstring, table} from "../store/proto";
import {RestResponseData} from "../server/rest";

export enum LoginMethod {
    PHONE = 0x1, // 手机登陆

    WECHAT_QRCODE = 0x21, // 微信扫码登陆
    WECHAT_PUB = 0x22, // 微信公众号授权登陆
    WECHAT_APP = 0x23, // 微信APP授权登陆

    // 判断用掩码，不放客户端
    WECHAT_MASK = 0x20,
}

export enum ShareMethod {
    PASSIVE = 0x1, // 被动分享
    WECHAT = 0x2, // 分享微信
}

export enum PayMethod {

    INAPP_APPLE = 0x11, // ios 内购

    WECHAT_QRCODE = 0x21, // 微信扫码支付
    WECHAT_PUB = 0x22, // 微信公众号支付
    WECHAT_APP = 0x23, // 微信APP支付
    WECHAT_H5 = 0x24,

    INAPP_MASK = 0x10,
    WECHAT_MASK = 0x20
}

export enum Sex {
    MALE = 1,
    FAMALE = 2,
}

// 当前访问通道得客户端支持的特性
export class Support {

    // 登陆
    login = {
        wechat: {
            qrcode: false, // 扫码登陆
            pub: false, // 公众号登陆
            app: false // 使用app登陆
        },
        phone: false, // 手机登陆
    };

    // 支付
    pay = {
        wechat: {
            qrcode: false, // 扫码支付
            pub: false, // 公众号支付
            app: false, // 拉起app支付
            h5: false // 使用H5SDK唤起APP支付
        },
        alipay: {
            qrcode: false, // 扫码支付
            h5: false, // h5页面支付
            app: false // 拉起app支付
        },
        inapp: {
            apple: false // ios内购
        },
        sms: false // 短代支付
    };

    // 分享
    share = {
        wechat: {
            icon: false, // 是否支持分享图标
            support: false // 是否支持分享
        }
    };

    // 渠道标记
    channel: string;

    // 从agent构造出支持信息
    static Agent(agent: string): Support {
        let sp = new Support();
        //logger.log("sdk处理agent: " + agent);

        // 默认支持手机登陆
        sp.login.phone = true;
        sp.channel = "common";

        if (agent.search(/MicroMessenger/) != -1) {
            // 微信浏览器打开
            sp.channel = "wechat";
            sp.login.wechat.pub = true;
            sp.login.phone = false;
            sp.pay.wechat.pub = true;
            sp.share.wechat.support = true;
        }
        else if (agent.search(/MicroApp/) != -1) {
            // 微端打开，和前端组约定
            sp.channel = "apicloud";
            sp.login.wechat.app = true;
            sp.share.wechat.support = true;
            sp.share.wechat.icon = true;
            if (agent.search(/MicroAppIOS/) != -1) {
                // iOS端
                sp.pay.inapp.apple = true;
            }
            else {
                sp.pay.wechat.app = true;
            }
        }
        else {
            // 网页打开
            sp.login.wechat.qrcode = true;

            if (agent.search(/Mobile/) != -1) {
                // 手机网页打开
                sp.pay.wechat.h5 = true;
            }
            else {
                sp.pay.wechat.qrcode = true;
            }
        }
        return sp;
    }
}

// 根据客户端的agent，计算将支持什么样的服务
@model()
export class Info {

    @string(1, [input, optional], "用来检查是否满足状态")
    url: string;

    @array(2, integer_t, [output], "登陆方式列表")
    logins = new Array<LoginMethod>();

    @array(3, integer_t, [output], "分享方式列表")
    shares = new Array<ShareMethod>();

    @array(4, integer_t, [output], "支付方式列表")
    pays = new Array<PayMethod>();

    @string(5, [output], "渠道类型")
    channel: string;

    @json(99, [output], "带出的数据")
    payload: IndexedObject = null;
}

@model()
export class Auth {

    @string(1, [input], "渠道")
    channel: string;

    @integer(2, [input], "登陆方式")
    method: LoginMethod;

    @string(3, [output], "需要打开的新链接")
    targeturl: string;

    @json(4, [input, optional], "info中拿到的数据")
    payload: IndexedObject;

    @string(5, [output], "平台中的用户id")
    uid: string;
}

@model()
export class Login {

    @string(1, [input], "平台的uid")
    uid: string;
}

// 检测平台得用户有没有过期，如果过期，需要客户端重新进行授权
@model()
export class CheckExpire {

    @string(1, [input], "平台中的用户id")
    uid: string;
}

@model()
export class Share {

    @string(1, [input, output])
    title: string;

    @string(2, [input, output])
    desc: string;

    @string(3, [input, output])
    link: string;

    @string(4, [input, output])
    image: string;

    @string(5, [input], "平台中的用户id")
    uid: string;

    @string(6, [input, optional], "当前的网页连接")
    href: string;

    @json(9, [output], "客户端分享需要的数据")
    payload: IndexedObject;
}

export enum PayStatus {
    SUC = 0,
    WAIT = 1,
    CANCEL = 2,
    FAILED = 3,
}

// 业务层用来扩展的支付纪录
@table("", "sdk_pay_records")
export class PayRecord {

    // 下单时间
    @colinteger()
    ordertime: number;

    // 完成时间
    @colinteger()
    donetime: number;

    // 过期时间
    @colinteger()
    expiretime: number = MAX_INT;

    // 支付状态
    @colinteger()
    status: PayStatus;

    @string(1, [input], "充值渠道")
    @colstring()
    channel: string;

    @string(2, [input], "充值方法")
    @colinteger()
    method: PayMethod;

    @string(3, [output], "订单号")
    @colstring()
    tid: string;

    @json(9, [output], "客户端调用payservice的数据")
    @coljson()
    payload: IndexedObject;
}

@model()
@table("", "sdk_payorders")
export class Pay {

    @integer(1, [input], "支付方式")
    @colinteger()
    method: PayMethod;

    @string(2, [input], "订单id")
    @colstring()
    orderid: string;

    @string(3, [input, optional], "物品id，不同渠道的方式不一样，有些传价格，有些传购买目标的id")
    @colstring()
    item: string;

    @integer(4, [input], "价格，单位为分")
    @colinteger()
    price: number;

    @string(5, [input, optional])
    @colstring()
    uid: string;

    @string(6, [input])
    @colstring()
    channel: string;

    @string(7, [input])
    @colstring()
    desc: string;

    @string(8, [input, optional], "客户端额外标记的信息")
    @colstring()
    tag: string;

    @json(9, [output], "客户端发起支付需要的数据")
    @coljson()
    payload: IndexedObject;
}

// 准备环境数据
@model()
export class Environment {

    @string(1, [input, optional])
    uid: string;

    @string(2, [input, optional])
    channel: string;

    @string(3, [input], "当前网页的完整url")
    href: string;

    @json(9, [output], "客户端需要的配置信息")
    payload: IndexedObject = {};
}

@model()
@table("", "sdk_users")
export class SdkUserInfo {

    @string(1, [input], "渠道")
    @colstring()
    channel: string;

    @colstring()
    userid: string; // 第三方平台中的唯一id(不管什么设备上登陆都是一样的）

    @colstring()
    deviceid: string; // 第三方平台当前登陆的id（不同设备上是不一样的）

    @colstring()
    nickname: string;

    @colinteger()
    sex: number;

    @colstring()
    avatar: string;

    @colinteger()
    time: number; // 登陆时间
}

@model()
@table("", "sdk_orderids")
export class SdkPayOrderId {

    @string(1, [output], "生成的订单号")
    orderid: string;
}

@model()
export class CompletePay {

    @integer(1, [input], "支付方式")
    method: PayMethod;

    @string(2, [input], "渠道")
    channel: string;

    @string(3, [output], "订单ID")
    orderid: string;

    @type(4, Object, [input, optional], "部分渠道会带上具体的验证数据")
    receipt: Object;

    @json(9, [output], "应答数据")
    respn: RestResponseData;
}

// 每个渠道的图片有可能只给外部一个id，接入服务需要通过特定的接口拉取到
@model()
export class GetRemoteMedia {

    @string(1, [input, optional])
    uid: string;

    @string(2, [input], "渠道")
    channel: string;

    @array(3, string_t, [input, optional], "资源在服务端的id表")
    ids: string[];

    @string(4, [input, optional])
    id: string;

    @file(5, [input, optional], "有些渠道传递的是客户端文件")
    file: any;

    @array(9, string_t, [output], "服务端的路径列表")
    paths: string[];

    // 传入的id表
    get medias(): Array<string> {
        let r = new Array<string>();
        if (this.ids)
            ArrayT.PushObjects(r, this.ids);
        if (this.id)
            r.push(this.id);
        if (this.file)
            r.push(this.file);
        return r;
    }
}
