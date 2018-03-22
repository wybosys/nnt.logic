import {
    AudioContent, AudioRecorder, ImageContent, ImagePicker, ImagePresenter, InfoContent, PayContent, SdkGet,
    Service, ShareContent, ShareMethod
} from "../service";
import {ArrayT, LoadJs, Mask, toJson} from "../utils";
import {NntService} from "./nnt";
import {IndexedObject} from "../model";
import {IMedia, UrlMedia} from "../media";

declare let wx: any;
declare let WeixinJSBridge: any;
let JSBRIDGE_AVALIABLE: boolean;

const CHANNEL = "wechat";

export class WechatJsApi extends NntService {

    prepare(info: InfoContent, cb: () => void) {
        LoadJs("wechat-jsapi", "https://res.wx.qq.com/open/js/jweixin-1.2.0.js", () => {
            super.prepare(info, cb);
        });
    }

    share(cnt: ShareContent) {
        if (cnt.method != ShareMethod.PASSIVE)
            return;

        this._doConfig(() => {
            function suc() {
                cnt.raiseEvent(Service.EVENT_SUCCESS);
            };

            function cancel() {
                cnt.raiseEvent(Service.EVENT_FAILED, new Error("取消分享"));
            };

            wx.onMenuShareTimeline({
                title: cnt.title,
                link: cnt.link,
                imgUrl: cnt.image,
                success: suc,
                cancel: cancel
            });
            wx.onMenuShareAppMessage({
                title: cnt.title,
                desc: cnt.desc,
                link: cnt.link,
                imgUrl: cnt.image,
                type: 'link',
                success: suc,
                cancel: cancel
            });
            wx.onMenuShareQQ({
                title: cnt.title,
                desc: cnt.desc,
                link: cnt.link,
                imgUrl: cnt.image,
                success: suc,
                cancel: cancel
            });
            wx.onMenuShareWeibo({
                title: cnt.title,
                desc: cnt.desc,
                link: cnt.link,
                imgUrl: cnt.image,
                success: suc,
                cancel: cancel
            });
            wx.onMenuShareQZone({
                title: cnt.title,
                desc: cnt.desc,
                link: cnt.link,
                imgUrl: cnt.image,
                success: suc,
                cancel: cancel
            });
        }, err => {
            cnt.raiseEvent(Service.EVENT_FAILED, err);
        });
    }

    protected _doConfig(suc: () => void, error: (err: Error) => void) {
        // 如果当前的url和之前的不一样，则需要重新配置
        let href = location.href;
        if (this._prevurl != href) {
            SdkGet("sdk.environment", {
                channel: 'wechat',
                href: href
            }, data => {
                let cfg = data.payload.wechat_jsapicfg;
                wx.config(cfg);
                wx.ready(() => {
                    suc();
                });
                wx.error((res: any) => {
                    error(new Error(toJson(res)));
                });
            }, err => {
                error(err);
            });
        }
        else {
            suc();
        }
    }

    private _prevurl: string;

    audio(cnt: AudioContent) {
        if (Mask.Has(cnt.acquire, AudioContent.RECORDER)) {
            cnt.recorder = new WcJsAudioRecorder();
        }
        cnt.raiseEvent(Service.EVENT_SUCCESS);
    }

    image(cnt: ImageContent) {
        if (Mask.Has(cnt.acquire, ImageContent.PICKER)) {
            cnt.picker = new WcJsImagePicker();
        }
        if (Mask.Has(cnt.acquire, ImageContent.PRESENTER)) {
            cnt.presenter = new WcJsImagePresenter();
        }
        cnt.raiseEvent(Service.EVENT_SUCCESS);
    }

    doPay(cnt: PayContent) {
        if (!JSBRIDGE_AVALIABLE) {
            let err = new Error("现在无法进行支付");
            cnt.raiseEvent(Service.EVENT_FAILED);
            return;
        }

        WeixinJSBridge.invoke(
            'getBrandWCPayRequest',
            cnt.payload,
            (res: IndexedObject) => {
                if (res.err_msg == "get_brand_wcpay_request:ok") {
                    cnt.raiseEvent(Service.EVENT_SUCCESS);
                }     // 使用以上方式判断前端返回,微信团队郑重提示：res.err_msg将在用户支付成功后返回    ok，但并不保证它绝对可靠。
                else if (res.err_msg == "get_brand_wcpay_request:cancel") {
                    let err = new Error("取消支付");
                    cnt.raiseEvent(Service.EVENT_FAILED, err);
                }
                else {
                    let err = new Error("支付失败");
                    cnt.raiseEvent(Service.EVENT_FAILED, err);
                }
            }
        );
    }


}

class WcJsImagePicker extends ImagePicker {

    pick(suc: (images: IMedia[]) => void) {
        let opt: IndexedObject = {
            count: this.count,
            sizeType: [],
            sourceType: []
        };
        if (Mask.Has(this.size, ImagePicker.ORIGIN))
            opt.sizeType.push("original");
        if (Mask.Has(this.size, ImagePicker.COMPRESSED))
            opt.sizeType.push("compressed");
        if (Mask.Has(this.source, ImagePicker.ALBUM))
            opt.sourceType.push("album");
        if (Mask.Has(this.source, ImagePicker.CAMERA))
            opt.sourceType.push("camera");
        opt.success = (res: any) => {
            let ids = res.localIds;
            ArrayT.AsyncConvert(ids, (next, id) => {
                // wx.getLocalImgData 接口只能在ios下使用，所以还是走通过服务器抓取素材得形式来获得图片
                wx.uploadImage({
                    localId: id,
                    isShowProgressTips: 1,
                    success: (res: any) => {
                        let sid = res.serverId;
                        next(sid);
                    }
                });
            }, (sids: string[]) => {
                // 通过wechat得接口将图片拿到图床
                SdkGet("sdk.remoteimages", {
                    uid: NntService.UID,
                    channel: CHANNEL,
                    ids: sids.join(",")
                }, data => {
                    let medias = ArrayT.Convert(data.paths, (e: string) => {
                        return new UrlMedia(e);
                    });
                    suc(medias);
                }, err => {
                    suc([]);
                });
            });
        };
        wx.chooseImage(opt);
    }
}

class WcJsImagePresenter extends ImagePresenter {

    present() {
        wx.previewImage({
            current: this.current,
            urls: this.urls
        });
    }
}

let RECORDING = false;
let PLAYING = false;

class WcJsAudioRecorder extends AudioRecorder {

    private _localId: string;

    start(cb?: (err: Error) => void) {
        if (PLAYING) {
            cb && cb(new Error("正在回放"));
            return;
        }
        if (RECORDING) {
            cb && cb(new Error("正在录音"));
            return;
        }
        RECORDING = true;

        this._localId = null;
        wx.startRecord();
        wx.onVoiceRecordEnd({
            // 录音时间超过一分钟没有停止的时候会执行 complete 回调
            complete: (res: any) => {
                this._localId = res.localId;
                RECORDING = false;
            }
        });
    }

    stop(cb?: (media?: IMedia) => void) {
        if (RECORDING) {
            wx.stopRecord({
                success: (res: any) => {
                    RECORDING = false;
                    this._localId = res.localId;
                    cb && this.doStop(cb);
                }
            });
        }
        else if (PLAYING) {
            wx.stopVoice({
                localId: this._localId
            });
            PLAYING = false;
        }
        else if (this._localId) {
            cb && this.doStop(cb);
        }
        else {
            cb && cb(null);
        }
    }

    play(cb?: (err: Error) => void) {
        if (PLAYING) {
            cb && cb(new Error("正在回放"));
            return;
        }
        if (RECORDING) {
            cb && cb(new Error("正在录音"));
            return;
        }
        PLAYING = true;

        wx.playVoice({
            localId: this._localId
        });
        wx.onVoicePlayEnd({
            success: (res: any) => {
                PLAYING = false;
            }
        });
    }

    protected doStop(cb: (media: IMedia) => void) {
        // 上传到服务器获得path
        wx.uploadVoice({
            localId: this._localId,
            isShowProgressTips: 1,
            success: (res: any) => {
                let sid = res.serverId;
                // 通过wechat得接口将图片拿到图床
                SdkGet("sdk.remoteaudios", {
                    uid: NntService.UID,
                    channel: CHANNEL,
                    ids: [sid].join(',')
                }, data => {
                    let path = data.paths[0];
                    cb(new UrlMedia(path));
                }, err => {
                    cb(null);
                });
            }
        });
    }
}

function onBridgeReady() {
    JSBRIDGE_AVALIABLE = true;
}

let DOC: any = document;
if (typeof WeixinJSBridge == "undefined") {
    if (DOC.addEventListener) {
        DOC.addEventListener('WeixinJSBridgeReady', onBridgeReady, false);
    }
    else if (DOC.attachEvent) {
        DOC.attachEvent('WeixinJSBridgeReady', onBridgeReady);
        DOC.attachEvent('onWeixinJSBridgeReady', onBridgeReady);
    }
} else {
    onBridgeReady();
}
