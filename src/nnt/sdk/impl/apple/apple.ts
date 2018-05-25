import {Channel} from "../../channel";
import {IndexedObject, make_tuple} from "../../../core/kernel";
import {
    Auth,
    CompletePay,
    Environment,
    GetRemoteMedia,
    Info,
    Login,
    Pay,
    SdkUserInfo,
    Share,
    Support
} from "../../msdk";
import {RegisterChannel, Sdk} from "../../sdk";
import {Transaction} from "../../../server/transaction";
import {IapReceiptValidate} from "./model";
import {Decode} from "../../../core/proto";
import {Insert, QueryOne} from "../../../manager/dbmss";
import {Output} from "../../../store/proto";
import {logger} from "../../../core/logger";
import {RestSession} from "../../../session/rest";
import {static_cast} from "../../../core/core";

interface AppleCfg {

    // 沙箱模式
    sandbox: boolean;
}

export class Apple extends Channel {

    constructor(sdk: Sdk) {
        super(sdk);
    }

    sandbox: boolean;

    config(cfg: IndexedObject): boolean {
        let c = static_cast<AppleCfg>(cfg);
        this.sandbox = c.sandbox;
        return true;
    }

    async doInfo(m: Info, sp: Support): Promise<void> {
    }

    async doAuth(m: Auth): Promise<boolean> {
        return true;
    }

    async doCheckExpire(ui: SdkUserInfo): Promise<boolean> {
        return false;
    }

    async doRenewal(ui: SdkUserInfo): Promise<boolean> {
        return true;
    }

    async doLogin(m: Login, ui: SdkUserInfo): Promise<boolean> {
        return true;
    }

    async doShare(m: Share, ui: SdkUserInfo): Promise<boolean> {
        return false;
    }

    async doPay(m: Pay, ui: SdkUserInfo, trans: Transaction): Promise<boolean> {
        return true;
    }

    async doCompletePay(m: CompletePay, trans: Transaction): Promise<boolean> {
        let iap = new IapReceiptValidate();
        Decode(iap, trans.params);
        iap.sandbox = this.sandbox;

        Insert(make_tuple(this._sdk.dbsrv, IapReceiptValidate), Output(iap));

        let oid = iap.orderid;
        iap = await RestSession.Get(iap);
        if (!iap) {
            logger.warn("苹果支付的订单验证失败 " + oid);
            return false;
        }

        // 查询订单是否一致
        let rcd = await QueryOne(make_tuple(this._sdk.dbsrv, Pay), {
            orderid: oid
        });
        if (!rcd) {
            logger.warn("没有查找到该苹果支付订单 " + oid);
            return false;
        }

        if (rcd.item != iap.product_id) {
            logger.warn("购买的商品和下单时不一致 " + oid + " " + iap.product_id);
            return false;
        }

        // 验证成功，返回单号
        m.orderid = oid;
        return true;
    }

    async doEnvironment(m: Environment, ui: SdkUserInfo): Promise<boolean> {
        return true;
    }

    async doRemoteImages(m: GetRemoteMedia, ui: SdkUserInfo): Promise<void> {

    }

    async doRemoteAudios(m: GetRemoteMedia, ui: SdkUserInfo): Promise<void> {

    }
}

RegisterChannel("apple", Apple);