import {
    AudioContent, AuthContent, ImageContent, ImagePicker, InfoContent, LoginContent, PayContent, SdkGet, SdkPost,
    Service, ShareContent
} from "../service";
import {Session} from "../session";
import {IMedia, UrlMedia} from "../media";
import {Mask, Queue} from "../utils";
import {H5AudioRecorder} from "./h5audio";

// 扫码支付Payload对应具体支付方法时具有的格式
export interface WeixinQrcodePayData {
    // 扫码支付需要表现的url类型
    url: string;
}

export interface WeixinH5PayData {
    // h5支付需要跳转的目标页面
    url: string;
}

// 应用配套的服务端提供的接入
export class NntService extends Service {

    prepare(cnt: InfoContent, cb: () => void) {
        // 首次请求info，payload为null
        // 选择登陆方式后并auth后，payload不为空
        // 自动再进行一次auth，就可以拿到uid
        if (cnt.payload) {
            // 尝试自动授权，获得uid
            let pl = cnt.payload;
            let auth = new AuthContent()
            auth.method = pl.login;
            auth.payload = pl;
            this.doAuth(auth, () => {
                cnt.uid = auth.uid;
                cb();
            }, err => {
                cb();
            });
        }
        else {
            cb();
        }
    }

    auth(cnt: AuthContent) {
        this.doAuth(cnt, () => {
            cnt.raiseEvent(Service.EVENT_SUCCESS);
        }, err => {
            cnt.raiseEvent(Service.EVENT_FAILED, err);
        });
    }

    protected doAuth(cnt: AuthContent, suc: () => void, err: (err: Error) => void) {
        SdkGet("sdk.auth", {
            channel: Session.CHANNEL,
            method: cnt.method,
            payload: cnt.payload
        }, data => {
            // 当需要跳转网页进行授权时，返回url
            cnt.targeturl = data.targeturl;
            // 如果授权成功，则直接拿到uid
            cnt.uid = data.uid;
            suc();
        }, err);
    }

    static UID: string;

    login(cnt: LoginContent) {
        SdkGet("sdk.login", {
            uid: cnt.uid
        }, data => {
            NntService.UID = cnt.uid;
            cnt.raiseEvent(Service.EVENT_SUCCESS);
        }, err => {
            cnt.raiseEvent(Service.EVENT_FAILED, err);
        });
    }

    share(cnt: ShareContent) {
        cnt.raiseEvent(Service.EVENT_FAILED, new Error("暂不支持"));
    }

    pay(cnt: PayContent) {
        // 请求服务器获得支付签名数据
        SdkGet("sdk.pay", {
            method: cnt.method,
            uid: NntService.UID,
            channel: Session.CHANNEL,
            orderid: cnt.orderid,
            item: cnt.item,
            price: cnt.price,
            desc: cnt.desc
        }, data => {
            cnt.payload = data.payload;
            this.doPay(cnt);
        }, err => {
            alert(err.message);
            cnt.raiseEvent(Service.EVENT_FAILED, err);
        });
    }

    protected doPay(cnt: PayContent) {
        cnt.raiseEvent(Service.EVENT_SUCCESS);
    }

    audio(cnt: AudioContent) {
        let q = new Queue();
        if (Mask.Has(cnt.acquire, AudioContent.RECORDER)) {
            q.add(next => {
                H5AudioRecorder.IsValid(support => {
                    if (support)
                        cnt.recorder = new H5AudioRecorder();
                    next();
                });
            });
        }
        q.add(next => {
            cnt.raiseEvent(Service.EVENT_SUCCESS);
        });
        q.run();
    }

    image(cnt: ImageContent) {
        if (Mask.Has(cnt.acquire, ImageContent.PICKER))
            cnt.picker = new NntImagePicker();
        cnt.raiseEvent(Service.EVENT_SUCCESS);
    }
}

class NntImagePicker extends ImagePicker {

    private _input: HTMLInputElement

    constructor() {
        super()
        this._input = document.createElement('input')
        this._input.setAttribute('type', 'file')
        this._input.setAttribute('accept', "image/*")
    }

    pick(suc: (urls: IMedia[]) => void) {
        this._input.click()
        let input = this._input
        this._input.onchange = function (e) {
            let file = input.files[0]
            SdkPost('sdk.remoteimages', {
                    channel: 'common'
                }, {
                    file: file
                },
                null,
                data => {
                    suc([new UrlMedia(data.paths[0])])
                },
                err => {
                    suc([]);
                });
        }
    }
}
