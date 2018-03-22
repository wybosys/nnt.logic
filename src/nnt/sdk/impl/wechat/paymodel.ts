import {input, integer, model, optional, output, string} from "../../../core/proto";
import {Base, HttpContentType, HttpMethod, IResponseData, RequestParams} from "../../../session/model";
import {colboolean, colinteger, colstring, table} from "../../../store/proto";
import xml = require("xmlbuilder");

@model()
export abstract class WechatPayModel extends Base {

    constructor() {
        super();
        this.requestType = HttpContentType.XML;
        this.responseType = HttpContentType.XML;
    }

    requestParams(): RequestParams {
        let rp = super.requestParams();
        rp.root = "xml";
        return rp;
    }

    parseData(resp: IResponseData, suc: () => void, error: (err: Error) => void) {
        let data = resp.data.xml;

        if (data.return_code == "SUCCESS") {
            resp.code = 0;
            resp.data = data;
            super.parseData(resp, suc, error);
        }
        else {
            resp.code = -1;
            let msg = data.return_code[0];
            if (data.return_msg[0])
                msg += "\n" + data.return_msg[0];
            let err = new Error(msg);
            error(err);
        }
    }
}

// 统一下单接口
@model()
@table("", "wechat_unifiedorders")
export class WechatUnifiedOrder extends WechatPayModel {

    constructor() {
        super();
        this.method = HttpMethod.POST;
    }

    requestUrl(): string {
        return "https://api.mch.weixin.qq.com/pay/unifiedorder";
    }

    @string(1, [input], "微信开放平台审核通过的应用APPID")
    @colstring()
    appid: string;

    @string(2, [input], "微信支付分配的商户号")
    @colstring()
    mch_id: string;

    @string(3, [input, optional], "终端设备号(门店号或收银设备ID)，默认请传\"WEB\"")
    @colstring()
    device_info: string = "WEB";

    @string(4, [input], "随机字符串，不长于32位")
    @colstring()
    nonce_str: string;

    @string(5, [input], "签名")
    @colstring()
    sign: string;

    @string(6, [input, optional], "签名类型，目前支持HMAC-SHA256和MD5，默认为MD5")
    @colstring()
    sign_type: string = "MD5";

    @string(7, [input], "商品描述交易字段格式根据不同的应用场景按照以下格式：APP——需传入应用市场上的APP名字-实际商品名称，天天爱消除-游戏充值。")
    @colstring()
    body: string;

    @string(8, [input, optional], "商品详细描述，对于使用单品优惠的商户，改字段必须按照规范上传")
    @colstring()
    detail: string;

    @string(9, [input, optional], "附加数据，在查询API和支付通知中原样返回，该字段主要用于商户携带订单的自定义数据")
    @colstring()
    attach: string;

    @string(10, [input], "商户系统内部订单号，要求32个字符内，只能是数字、大小写字母_-|*@ ，且在同一个商户号下唯一")
    @colstring()
    out_trade_no: string;

    @string(11, [input, optional], "符合ISO 4217标准的三位字母代码，默认人民币：CNY")
    @colstring()
    fee_type: string = "CNY";

    @integer(12, [input], "订单总金额，单位为分")
    @colinteger()
    total_fee: number;

    @string(13, [input], "用户端实际ip")
    @colstring()
    spbill_create_ip: string;

    @string(14, [input, optional], "订单生成时间，格式为yyyyMMddHHmmss，如2009年12月25日9点10分10秒表示为20091225091010")
    @colstring()
    time_start: string;

    @string(15, [input, optional], "订单失效时间，格式为yyyyMMddHHmmss，如2009年12月27日9点10分10秒表示为20091227091010")
    @colstring()
    time_expire: string;

    @string(16, [input, optional], "订单优惠标记，代金券或立减优惠功能的参数")
    @colstring()
    goods_tag: string;

    @string(17, [input], "接收微信支付异步通知回调地址，通知url必须为直接可访问的url，不能携带参数。")
    @colstring()
    notify_url: string;

    @string(18, [input], "支付类型 JSAPI，NATIVE，APP")
    @colstring()
    trade_type: string = "APP";

    @string(19, [input, optional], "no_credit--指定不能使用信用卡支付")
    @colstring()
    limit_pay: string;

    @string(20, [input, optional], "该字段用于统一下单时上报场景信息，目前支持上报实际门店信息。 {\"store_id\": \"\", //门店唯一标识，选填，String(32)\"store_name\":\"”//门店名称，选填，String(64) }")
    @colstring()
    scene_info: string;

    @string(21, [output], "微信生成的预支付回话标识，用于后续接口调用中使用，该值有效期为2小时")
    @colstring()
    prepay_id: string;

    @string(22, [output], "没有出现在统一下单的文档中，h5支付的文档有提及")
    @colstring()
    mweb_url: string;

    @string(23, [input, optional], "trade_type=JSAPI时（即公众号支付），此参数必传，此参数为微信用户在商户对应appid下的唯一标识")
    @colstring()
    openid: string;

    @string(24, [output], "trade_type为NATIVE时有返回，用于生成二维码，展示给用户进行扫码支付")
    code_url: string;

    @colinteger()
    created: number; // 订单创建时间

    @colboolean()
    success: boolean; // 订单下单成功还是失败

    // 微信后台配置的key
    signkey: string;
}

@model()
@table("", "wechat_payresults")
export class WechatPayResult {

    @string(1, [input, output], "微信开放平台审核通过的应用APPID")
    @colstring()
    appid: string;

    @string(2, [input, output], "微信支付分配的商户号")
    @colstring()
    mch_id: string;

    @string(3, [input, output], "微信支付分配的终端设备号")
    @colstring()
    device_info: string;

    @string(4, [input, output], "随机字符串，不长于32位")
    @colstring()
    nonce_str: string;

    @string(5, [input], "签名")
    @colstring()
    sign: string;

    @string(6, [input, output], "用户在商户appid下的唯一标识")
    @colstring()
    openid: string;

    @string(7, [input, output, optional], "用户是否关注公众账号，Y-关注，N-未关注，仅在公众账号类型支付有效")
    @colstring()
    is_subscribe: string;

    @string(8, [input, output], "APP")
    @colstring()
    trade_type: string;

    @string(9, [input, output], "银行类型，采用字符串类型的银行标识")
    @colstring()
    bank_type: string;

    @integer(10, [input, output], "订单总金额，单位为分")
    @colinteger()
    total_fee: number;

    @string(11, [input, output, optional], "货币类型，符合ISO4217标准的三位字母代码")
    @colstring()
    fee_type: string;

    @integer(12, [input, output], "现金支付金额")
    @colinteger()
    cash_fee: number;

    @string(13, [input, output, optional], "货币类型，符合ISO4217标准的三位字母代码")
    @colstring()
    cash_fee_type: string;

    @integer(14, [input, output, optional], "代金券或立减优惠金额<=订单总金额，订单总金额-代金券或立减优惠金额=现金支付金额")
    @colinteger()
    coupon_fee: number;

    @integer(15, [input, output, optional], "代金券或立减优惠使用数量")
    @colinteger()
    coupon_count: number;

    @string(16, [input, output, optional], "代金券或立减优惠ID,$n为下标，从0开始编号")
    @colstring()
    coupon_id_$n: string;

    @string(17, [input, output, optional], "单个代金券或立减优惠支付金额,$n为下标，从0开始编号")
    @colstring()
    coupon_fee_$n: string;

    @string(18, [input, output], "微信支付订单号")
    @colstring()
    transaction_id: string;

    @string(19, [input, output], "商户系统内部订单号，要求32个字符内，只能是数字、大小写字母_-|*@ ，且在同一个商户号下唯一。")
    @colstring()
    out_trade_no: string;

    @string(20, [input, output, optional], "商家数据包，原样返回")
    @colstring()
    attach: string;

    @string(21, [input, output], "支付完成时间，格式为yyyyMMddHHmmss，如2009年12月25日9点10分10秒表示为20091225091010")
    @colstring()
    time_end: string;

    @string(22, [input, output])
    @colstring()
    result_code: string;

    @string(23, [input, optional])
    @colstring()
    err_code: string;

    @string(24, [input, optional])
    @colstring()
    err_code_des: string;

    @string(25, [input, output])
    @colstring()
    return_code: string;

    @string(26, [input, optional])
    @colstring()
    return_msg: string;

    @colinteger()
    status: number; // 处理状态码
}