import {action, IRouter} from "../core/router";
import {
    Auth, CheckExpire, CompletePay, Environment, GetRemoteMedia, Info, Login, LoginMethod, Pay, PayMethod,
    SdkPayOrderId, SdkUserInfo, Share, ShareMethod, Support
} from "./msdk";
import {Sdk} from "./sdk";
import {Transaction} from "../server/transaction";
import {AutoInc, Insert, Query} from "../manager/dbmss";
import {format, make_tuple, ObjectT} from "../core/kernel";
import {STATUS} from "../core/models";
import {TODAY_DAY, TODAY_MONTH, TODAY_YEAR} from "../component/today";
import {logger} from "../core/logger";

export class RSdk implements IRouter {
    action = "sdk";

    constructor(srv: Sdk) {
        this._sdk = srv;
    }

    protected _sdk: Sdk; // 绑定的sdk服务

    @action(Info, [], "检查当前客户端环境对SDK的支持情况")
    async info(trans: Transaction) {
        let m: Info = trans.model;
        let sp = Support.Agent(trans.info.agent);
        trans.timeout(20);

        m.payload = {};
        await this._sdk.channels().forEach(async e => {
            await e.doInfo(m, sp);
            return true;
        });

        // 判断支持的登陆方式
        if (sp.login.wechat.qrcode)
            m.logins.push(LoginMethod.WECHAT_QRCODE);
        if (sp.login.wechat.pub)
            m.logins.push(LoginMethod.WECHAT_PUB);
        if (sp.login.wechat.app)
            m.logins.push(LoginMethod.WECHAT_APP);
        if (sp.login.phone)
            m.logins.push(LoginMethod.PHONE);

        // 支持的分享方式
        if (sp.share.wechat.icon)
            m.shares.push(ShareMethod.PASSIVE);
        if (sp.share.wechat.support)
            m.shares.push(ShareMethod.WECHAT);

        // 支持的支付方式
        if (sp.pay.wechat.qrcode)
            m.pays.push(PayMethod.WECHAT_QRCODE);
        if (sp.pay.wechat.pub)
            m.pays.push(PayMethod.WECHAT_PUB);
        if (sp.pay.wechat.app)
            m.pays.push(PayMethod.WECHAT_APP);
        if (sp.pay.wechat.h5)
            m.pays.push(PayMethod.WECHAT_H5);
        if (sp.pay.inapp.apple)
            m.pays.push(PayMethod.INAPP_APPLE);

        m.channel = sp.channel;
        if (!ObjectT.Length(m.payload))
            m.payload = null;
        trans.submit();
    }

    @action(Auth, [], "第三方授权")
    async auth(trans: Transaction) {
        let m: Auth = trans.model;
        trans.timeout(20);

        let chann = this._sdk.channel(m.channel);
        if (!chann) {
            logger.warn("sdk: 没有找到channel " + m.channel);
            trans.status = STATUS.TARGET_NOT_FOUND;
            trans.submit();
            return;
        }

        if (!await chann.doAuth(m)) {
            trans.status = STATUS.THIRD_FAILED;
            trans.submit();
            return;
        }

        trans.submit();
    }

    @action(Login, [], "登陆SDK")
    async login(trans: Transaction) {
        let m: Login = trans.model;
        trans.timeout(20);

        let rcd = await Query(make_tuple(this._sdk.dbsrv, SdkUserInfo), m.uid);
        if (!rcd) {
            trans.status = STATUS.TARGET_NOT_FOUND;
            trans.submit();
            return;
        }

        let chann = this._sdk.channel(rcd.channel);
        if (!await chann.doLogin(m, rcd)) {
            trans.status = STATUS.THIRD_FAILED;
            trans.submit();
            return;
        }

        trans.submit();
    }

    @action(CheckExpire, [], "检查第三方登陆的账号是否授权超时")
    async checkexpire(trans: Transaction) {
        let m: CheckExpire = trans.model;
        trans.timeout(20);

        let rcd = await Query(make_tuple(this._sdk.dbsrv, SdkUserInfo), m.uid);
        if (!rcd) {
            trans.status = STATUS.TARGET_NOT_FOUND;
            trans.submit();
            return;
        }

        let chan = this._sdk.channel(rcd.channel);
        if (!await chan.doCheckExpire(rcd))
            trans.status = STATUS.AUTH_EXPIRED;

        trans.submit();
    }

    @action(Environment, [], "客户端准备环境")
    async environment(trans: Transaction) {
        let m: Environment = trans.model;
        trans.timeout(20);

        let rcd: SdkUserInfo;
        if (m.uid) {
            rcd = await Query(make_tuple(this._sdk.dbsrv, SdkUserInfo), m.uid);
            if (!rcd) {
                trans.status = STATUS.TARGET_NOT_FOUND;
                trans.submit();
                return;
            }
        }

        let chann = this._sdk.channel(m.channel);
        if (!chann) {
            logger.warn("sdk: 没有找到channel " + m.channel);
            trans.status = STATUS.TARGET_NOT_FOUND;
            trans.submit();
            return;
        }

        if (!await chann.doEnvironment(m, rcd)) {
            trans.status = STATUS.THIRD_FAILED;
            trans.submit();
            return;
        }

        trans.submit();
    }

    @action(Share, [], "返回客户端具体的渠道分享数据")
    async share(trans: Transaction) {
        let m: Share = trans.model;

        let rcd = await Query(make_tuple(this._sdk.dbsrv, SdkUserInfo), m.uid);
        if (!rcd) {
            trans.status = STATUS.TARGET_NOT_FOUND;
            trans.submit();
            return;
        }

        let chann = this._sdk.channel(rcd.channel);
        if (!await chann.doShare(m, rcd)) {
            trans.status = STATUS.THIRD_FAILED;
            trans.submit();
            return;
        }

        trans.submit();
    }

    @action(Pay, [], "服务端给渠道下单，返回客户端支付数据发起客户端支付")
    async pay(trans: Transaction) {
        let m: Pay = trans.model;
        trans.timeout(20);

        let chann = this._sdk.channel(m.channel);
        if (!chann) {
            logger.warn("sdk: 没有找到channel " + m.channel);
            trans.status = STATUS.TARGET_NOT_FOUND;
            trans.submit();
            return;
        }

        let rcd: SdkUserInfo;
        if (m.uid) {
            rcd = await Query(make_tuple(this._sdk.dbsrv, SdkUserInfo), m.uid);
            if (!rcd) {
                trans.status = STATUS.TARGET_NOT_FOUND;
                trans.submit();
                return;
            }
        }

        if (!await chann.doPay(m, rcd, trans)) {
            trans.status = STATUS.THIRD_FAILED;
            trans.submit();
            return;
        }

        if (trans.status == STATUS.OK) {
            // 保存到预支付的表中，用来验证支付时验证订单
            Insert(make_tuple(this._sdk.dbsrv, Pay), m);
        }

        trans.submit();
    }

    @action(CompletePay, [], "验证订单，成功后，业务层服务器负责发货")
    async completepay(trans: Transaction) {
        let m: CompletePay = trans.model;
        trans.timeout(20);

        let chann = this._sdk.channel(m.channel);
        if (!chann) {
            logger.warn("sdk: 没有找到channel " + m.channel);
            trans.status = STATUS.TARGET_NOT_FOUND;
            trans.submit();
            return;
        }

        if (!await chann.doCompletePay(m, trans)) {
            trans.status = STATUS.THIRD_FAILED;
            trans.submit();
            return;
        }

        trans.submit();
    }

    @action(SdkPayOrderId, [], "请求订单号")
    async payorderid(trans: Transaction) {
        let m: SdkPayOrderId = trans.model;
        // 规则，year/month/day 000000000
        let oid = await AutoInc(make_tuple(this._sdk.dbsrv, SdkPayOrderId), "orderid");
        let plain = format("%04d%02d%02d%010d", TODAY_YEAR, TODAY_MONTH, TODAY_DAY, oid);
        m.orderid = plain;
        trans.submit();
    }

    @action(GetRemoteMedia, [], "通过渠道获得远端的图片")
    async remoteimages(trans: Transaction) {
        let m: GetRemoteMedia = trans.model;

        let rcd: SdkUserInfo;
        if (m.uid) {
            rcd = await Query(make_tuple(this._sdk.dbsrv, SdkUserInfo), m.uid);
            if (!rcd) {
                trans.status = STATUS.TARGET_NOT_FOUND;
                trans.submit();
                return;
            }
        }

        trans.timeout(20);

        let chann = this._sdk.channel(m.channel);
        if (!chann) {
            logger.warn("sdk: 没有找到channel " + m.channel);
            trans.status = STATUS.TARGET_NOT_FOUND;
            trans.submit();
            return;
        }

        await chann.doRemoteImages(m, rcd);

        trans.submit();
    }

    @action(GetRemoteMedia, [], "通过渠道获得远端的语音")
    async remoteaudios(trans: Transaction) {
        let m: GetRemoteMedia = trans.model;

        let rcd: SdkUserInfo;
        if (m.uid) {
            rcd = await Query(make_tuple(this._sdk.dbsrv, SdkUserInfo), m.uid);
            if (!rcd) {
                trans.status = STATUS.TARGET_NOT_FOUND;
                trans.submit();
                return;
            }
        }

        trans.timeout(20);

        let chann = this._sdk.channel(m.channel);
        if (!chann) {
            logger.warn("sdk: 没有找到channel " + m.channel);
            trans.status = STATUS.TARGET_NOT_FOUND;
            trans.submit();
            return;
        }

        await chann.doRemoteAudios(m, rcd);

        trans.submit();
    }
}
