// 第三方的服务接入
import {Base, HttpMethod, IndexedObject} from "./model";
import {EventDispatcher} from "./eventdispatcher";
import {Session} from "./session";
import {IMedia} from "./media";

// 和服务端的type对应
export enum LoginMethod {
    PHONE = 0x1, // 手机登陆

    WECHAT_QRCODE = 0x21, // 微信扫码登陆
    WECHAT_PUB = 0x22, // 微信公众号授权登陆
    WECHAT_APP = 0x23, // 微信APP授权登陆
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
}

export abstract class Service {

    // 列出sdk的能力
    abstract prepare(cnt: InfoContent, cb: () => void): void;

    // 授权
    abstract auth(cnt: AuthContent): void;

    // 登陆SDK
    abstract login(cnt: LoginContent): void;

    // 购买
    abstract pay(cnt: PayContent): void;

    // 分享
    abstract share(cnt: ShareContent): void;

    // 音频
    abstract audio(cnt: AudioContent): void;

    // 图像
    abstract image(cnt: ImageContent): void;

    // 判断当前自己是否可用
    static IsValid(): boolean {
        return false;
    }

    static EVENT_SUCCESS = "::nnt::service::success";
    static EVENT_FAILED = "::nnt::service::failed";
}

// sdk调用数据对象
export abstract class Content extends EventDispatcher {
    proc: string;
}

export class InfoContent extends Content {

    // 支持的登陆方式
    logins = new Array<LoginMethod>();

    // 支持的分享方式
    shares = new Array<ShareMethod>();

    // 支持的支付方式
    pays = new Array<PayMethod>();

    // 用户平台id，如果不为空，则可以跳过auth过程
    uid: string;

    // 返回的其他数据
    payload: IndexedObject;
}

// 授权，调用后会返回当前支持的信息
export class AuthContent extends Content {
    proc = "auth";

    // 登陆方式
    method: LoginMethod;

    // 目标url（前往授权网站)
    targeturl?: string;

    // 是否需要客户端刷新页面
    refresh: boolean;

    // sdk平台中的uid
    uid: string;

    // info返回的payload
    payload: IndexedObject;
}

// 登陆
export class LoginContent extends Content {
    proc = "login";

    // 平台id
    uid: string;

    // 不同渠道登陆后需要做对应的初始化
    payload: IndexedObject;
}

export enum ShareType {
    IMAGE = 1,
    WEBSITE = 2,
}

// 分享
export class ShareContent extends Content {
    proc = "share";

    // 分享的方式
    method: ShareMethod;

    // 分享的方式
    type = ShareType.WEBSITE;

    // 标题
    title: string;

    // 描述
    desc: string;

    // 跳转链接
    link: string;

    // 带出的图片
    image: string;
}

// 充值
export class PayContent extends Content {
    proc = "pay";

    // 支付方式
    method: PayMethod;

    // 订单id
    orderid: string;

    // 商品id
    item: string;

    // 价格
    price: number;

    // 描述
    desc: string;

    // 服务端签名后的数据
    payload: IndexedObject;
}

// 录音对象
export abstract class AudioRecorder {

    // 开始录音
    abstract start(cb?: (err: Error) => void): void;

    // 结束录音（结束时返回录音的内容）或者结束播放（返回null）
    abstract stop(cb?: (media?: IMedia) => void): void;

    // 回放录音
    abstract play(cb?: (err: Error) => void): void;
}

// 音频
export class AudioContent extends Content {
    proc = "audio";

    static RECORDER = 0x1; // 录音

    // 请求的类型
    acquire: number;

    // 渠道实现，如果是null，则代表不支持
    recorder: AudioRecorder;
}

// 选择图像
// 不同渠道sdk选取图片的数据格式不同，但是通过sdk处理后，均为图床中的图片
export abstract class ImagePicker {

    static ORIGIN = 0x1; // 原图
    static COMPRESSED = 0x2; // 压缩过的
    static ALBUM = 0x1; // 相册
    static CAMERA = 0x2; // 照相机

    // 拾取数量
    count = 1;

    // 尺寸类型
    size = ImagePicker.ORIGIN | ImagePicker.COMPRESSED;

    // 源类型
    source = ImagePicker.ALBUM | ImagePicker.CAMERA;

    // 拾取图片(返回的时图片的内容)
    abstract pick(suc: (images: IMedia[]) => void): void;
}

// 预览图像
export abstract class ImagePresenter {

    // 当前显示的图片
    current: string;

    // 图片库
    urls = new Array<string>();

    // 展示
    abstract present(): void;
}

// 图像
export class ImageContent extends Content {
    proc = "image";

    static PICKER = 0x1;
    static PRESENTER = 0x2;

    // 请求的类型
    acquire: number;

    // 渠道实现，如果是null，则代表不支持
    picker: ImagePicker;
    presenter: ImagePresenter;
}

// 请求接口
export function SdkGet(action: string,
                       params: IndexedObject,
                       suc: (data: IndexedObject) => void,
                       error?: (err: Error) => void) {
    let clz = Base.Impl.models["Null"];
    let m = new clz();
    m.action = action;
    m.additionParams = params;
    Session.Fetch(m, () => {
        let data = m.data;
        suc(data);
    }, err => {
        error && error(err);
    });
}

export function SdkPost(action: string,
                        params: IndexedObject,
                        files: IndexedObject,
                        medias: IndexedObject,
                        suc: (data: IndexedObject) => void,
                        error?: (err: Error) => void) {
    let clz = Base.Impl.models["Null"];
    let m = new clz();
    m.action = action;
    m.method = HttpMethod.POST;
    m.additionParams = params;
    m.additionFiles = files;
    m.additionMedias = medias;
    Session.Fetch(m, () => {
        let data = m.data;
        suc(data);
    }, err => {
        error && error(err);
    });
}
