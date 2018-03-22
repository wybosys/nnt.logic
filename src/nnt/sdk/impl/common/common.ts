import {Channel} from "../../channel";
import {AsyncArray, IndexedObject, Mask} from "../../../core/kernel";
import {
    Auth, CompletePay, Environment, GetRemoteMedia, Info, Login, LoginMethod, Pay, PayMethod, SdkUserInfo, Share,
    Support
} from "../../msdk";
import {RegisterChannel, Sdk} from "../../sdk";
import {Transaction} from "../../../server/transaction";
import {Call} from "../../../manager/servers";

export class Common extends Channel {

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
        return true;
    }

    async doCompletePay(m: CompletePay, trans: Transaction): Promise<boolean> {
        return true;
    }

    async doEnvironment(m: Environment, ui: SdkUserInfo): Promise<boolean> {
        return true;
    }

    async doRemoteImages(m: GetRemoteMedia, ui: SdkUserInfo): Promise<void> {
        m.paths = await (AsyncArray(m.medias).convert<string>((e, done) => {
            Call(this._sdk.imgsrv, 'imagestore.upload', {
                file: e
            }).then(t => {
                done(t.model.path)
            });
        }))
    }

    async doRemoteAudios(m: GetRemoteMedia, ui: SdkUserInfo): Promise<void> {

    }
}

RegisterChannel("common", Common);