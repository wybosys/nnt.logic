import {Content, InfoContent, LoginMethod, PayMethod, SdkGet, Service, ShareMethod} from "./service";
import {Session} from "./session";
import {NntService} from "./service/nnt";
import {ApiCldService} from "./service/apicld";
import {WechatJsApi} from "./service/wechatjsapi";
import {MockService} from "./service/mock";

export class Services {

    // 默认的服务
    static _default: Service;

    static Fetch<T extends Content>(cnt: T, suc: (cnt: T) => void, err?: (err: Error) => void) {
        let proc = (<any>Services._default)[cnt.proc];
        cnt.addListener(Service.EVENT_SUCCESS, () => {
            suc(cnt);
        });
        if (err)
            cnt.addListener(Service.EVENT_FAILED, err);
        proc.call(Services._default, cnt);
    }

    static Launch(cb: (info: InfoContent) => void) {
        let cnt = new InfoContent();
        SdkGet("sdk.info", {
            url: Session.LOCATION
        }, data => {
            cnt.payload = data.payload;
            LOGINS = cnt.logins = data.logins;
            SHARES = cnt.shares = data.shares;
            PAYS = cnt.pays = data.pays;

            let svc: Service;
            switch (data.channel) {
                case "common":
                    svc = new NntService();
                    break;
                case "apicloud":
                    svc = new ApiCldService();
                    break;
                case "wechat":
                    svc = new WechatJsApi();
                    break;
                default:
                    svc = new MockService();
                    break;
            }

            Services._default = svc;
            Session.CHANNEL = data.channel;

            // 使用特定的服务初始化信息
            svc.prepare(cnt, () => {
                cb(cnt);
            });
        });
    }
}

let LOGINS: LoginMethod[];
let SHARES: ShareMethod[];
let PAYS: PayMethod[];
