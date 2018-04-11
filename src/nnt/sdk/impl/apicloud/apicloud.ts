import {Channel} from "../../channel";
import {AsyncArray, IndexedObject, Mask, toJson, toJsonObject} from "../../../core/kernel";
import {
    Auth, CompletePay, Environment, GetRemoteMedia, Info, Login, LoginMethod, Pay, PayMethod, SdkUserInfo, Share,
    Support
} from "../../msdk";
import {RegisterChannel, Sdk} from "../../sdk";
import {Transaction} from "../../../server/transaction";
import {Call} from "../../../manager/servers";
import {AudioSupport} from "../../../server/audiostore";

export class Apicloud extends Channel {

    constructor(sdk: Sdk) {
        super(sdk);
    }

    config(cfg: IndexedObject): boolean {
        return true;
    }

    async doInfo(m: Info, sp: Support): Promise<void> {
    }

    async doAuth(m: Auth): Promise<boolean> {
        if (Mask.Has(m.method, LoginMethod.WECHAT_MASK)) {
            let chann = this._sdk.channel("wechat");
            return chann.doAuth(m);
        }
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
        if (Mask.Has(m.method, PayMethod.WECHAT_MASK)) {
            return this._sdk.channel("wechat").doPay(m, ui, trans);
        }
        if (Mask.Has(m.method, PayMethod.INAPP_MASK)) {
            if (m.method == PayMethod.INAPP_APPLE)
                return this._sdk.channel("apple").doPay(m, ui, trans);
        }
        return true;
    }

    async doCompletePay(m: CompletePay, trans: Transaction): Promise<boolean> {
        if (Mask.Has(m.method, PayMethod.WECHAT_MASK)) {
            return this._sdk.channel("wechat").doCompletePay(m, trans);
        }
        if (Mask.Has(m.method, PayMethod.INAPP_MASK)) {
            if (m.method == PayMethod.INAPP_APPLE) {
                // 提取约定的数据内容
                let ps = trans.params;
                let pl = toJsonObject(ps.payload, {applicationUsername: null, receipt: null});
                ps.orderid = pl.applicationUsername;
                ps.receipt = pl.receipt;
                //logger.info("收到 " + ps.orderid + " 的验证请求 " + ps.receipt);
                return this._sdk.channel("apple").doCompletePay(m, trans);
            }
        }
        return true;
    }

    async doEnvironment(m: Environment, ui: SdkUserInfo): Promise<boolean> {
        return true;
    }

    async doRemoteImages(m: GetRemoteMedia, ui: SdkUserInfo): Promise<void> {

    }

    async doRemoteAudios(m: GetRemoteMedia, ui: SdkUserInfo): Promise<void> {
        m.paths = await (AsyncArray(m.medias).convert<string>((e, done) => {
            Call(this._sdk.mediasrv, 'audiostore.upload', {
                type: AudioSupport.AMR,
                file: e
            }).then(t => {
                done(t.model.path);
            })
        }))
    }
}

RegisterChannel("apicloud", Apicloud);