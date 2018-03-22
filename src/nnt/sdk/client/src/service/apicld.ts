import {NntService} from "./nnt";
import {
  AudioContent, AudioRecorder, AuthContent, InfoContent, PayContent, PayMethod, SdkPost, Service, ShareContent,
  ShareType
} from "../service";
import {Base, IndexedObject} from "../model";
import {Session} from "../session";
import {IMedia, UrlMedia} from "../media";
import {Mask, timestamp} from "../utils";

const CHANNEL = 'apicloud'

export class ApiCldService extends NntService {
  static SHARE_SCENE = 'timeline';

  auth(cnt: AuthContent) {
    let win: IndexedObject = window;
    this.doAuth(cnt, () => {
      if (cnt.targeturl) {
        let url = new URL(cnt.targeturl);
        let state = url.searchParams.get("state");
        win['wx'].auth({}, (res: IndexedObject, err: IndexedObject) => {
          if (err && err.code) {
            switch (err.code) {
              case 1:
                alert('您取消了微信登录')
                break
              case 2:
                alert('您拒绝了使用微信登录')
                break
              case 3:
                alert('您尚未安装微信')
                break
              default:
                alert('唤起微信失败')
            }
          }
          Session.LOCATION = "https://localhost/?code=" + res.code + "&state=" + state;
          cnt.raiseEvent(Service.EVENT_SUCCESS);
        });
        cnt.targeturl = null;
        cnt.refresh = true;
      }
      else {
        cnt.raiseEvent(Service.EVENT_SUCCESS);
      }
    }, err => {
      cnt.raiseEvent(Service.EVENT_FAILED, err);
    });
  }

  share(cnt: ShareContent) {
    let win: IndexedObject = window;
    let wx: IndexedObject = win['wx'];
    if (cnt.image.indexOf('widget://') == -1 && cnt.image.indexOf('fs://') == -1) {
      //必需为手机端本地路径，fs://xx/xxx.png 格式
      cnt.image = 'widget://image/shareico.png'
    }

    if (cnt.type == ShareType.IMAGE) {
      wx.shareImage({
        scene: ApiCldService.SHARE_SCENE,
        contentUrl: cnt.image
      }, cb)
    }
    else {
      wx.shareWebpage({
        scene: ApiCldService.SHARE_SCENE,
        title: cnt.title,
        description: cnt.desc,
        thumb: cnt.image,
        contentUrl: cnt.link
      }, cb)
    }

    function cb(ret: IndexedObject, err: IndexedObject) {
      if (ret.status) {
        cnt.raiseEvent(Service.EVENT_SUCCESS);
      }
      else {
        cnt.raiseEvent(Service.EVENT_FAILED);
      }
    }
  }

  protected doPay(cnt: PayContent) {
    let win: IndexedObject = window;

    if (win['iap']) {//苹果支付
      this.payByApple(win['iap'], cnt);
    }
    else {//微信支付
      this.payByWeixin(win['wxPay'], cnt);
    }
  }

  private payByWeixin(pay:IndexedObject, cnt: PayContent) {
    let pl: IndexedObject = cnt.payload;
    pay.payOrder({
      apiKey: pl.appid,
      orderId: pl.prepayid,
      mchId: pl.partnerid,
      nonceStr: pl.noncestr,
      timeStamp: pl.timestamp,
      package: pl.package,
      sign: pl.sign
    }, (ret: IndexedObject, err: IndexedObject) => {
      if (ret.status) {
        cnt.raiseEvent(Service.EVENT_SUCCESS)
      }
      else {
        cnt.raiseEvent(Service.EVENT_FAILED)
      }
    })
  }

  private payByApple(pay:IndexedObject, cnt: PayContent) {
    pay.purchase({
      productId: cnt.item,
      applicationUsername: cnt.orderid
    }, (ret:IndexedObject, err:IndexedObject) => {
      if (ret.state == 1) {
        SdkPost('shop.done', {
          method: PayMethod.INAPP_APPLE,
          channel: 'apicloud',
          payload: JSON.stringify(ret)
        }, null, null, data => {
          cnt.raiseEvent(Service.EVENT_SUCCESS)
        }, err => {
          cnt.raiseEvent(Service.EVENT_FAILED, '服务器返回错误')
          alert('服务器返回错误')
        })
      }
      else {
        cnt.raiseEvent(Service.EVENT_FAILED, err.msg)
        alert(err.msg)
      }
    })
  }

  audio(cnt: AudioContent) {
    if (Mask.Has(cnt.acquire, AudioContent.RECORDER)) {
      cnt.recorder = new ApicldAudioRecorder()
    }
    cnt.raiseEvent(Service.EVENT_SUCCESS)
  }

  // image(cnt: ImageContent) {
  //   // cnt.raiseEvent(Service.EVENT_FAILED);
  //
  // }
}

export class ApicldAudioRecorder extends AudioRecorder {

  // 开始录音
  start(cb?: (err: Error) => void): void {
    let win: IndexedObject = window
    win.api.startRecord({
      path: 'fs://party_chat_' + timestamp() + '.amr'
    })
    cb && cb(null)
  }

  // 结束录音（结束时返回录音的内容）或者结束播放（返回null）
  stop(cb?: (media?: IMedia) => void): void {
    let win: IndexedObject = window;
    win.api.stopRecord((ret: IndexedObject, err: IndexedObject) => {
      if (ret) {
        let clz = Base.Impl.models['Null'];
        let m = new clz();
        win.api.ajax({
          url: 'https://' + m.host,
          method: 'post',
          data: {
            values: {
              action: 'sdk.remoteaudios',
              channel: CHANNEL
            },
            files: {
              file: ret.path
            }
          }
        }, (ret: IndexedObject, err: IndexedObject) => {

          if (ret.code == 0) {
            let path = ret.data.paths[0]
            cb(new UrlMedia(path))
          }
          else if (err) {
            cb(null)
            alert(err.msg + '_' + err.code)
          }
          else {
            cb(null)
          }
        })
      }
    })
  }

  // 回放录音
  play(cb?: (err: Error) => void): void {

  }
}
