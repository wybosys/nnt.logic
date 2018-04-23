import { IndexedObject } from "./model";
import { EventDispatcher } from "./eventdispatcher";
import { IMedia } from "./media";
export declare enum LoginMethod {
    PHONE = 1,
    WECHAT_QRCODE = 33,
    WECHAT_PUB = 34,
    WECHAT_APP = 35,
}
export declare enum ShareMethod {
    PASSIVE = 1,
    WECHAT = 2,
}
export declare enum PayMethod {
    INAPP_APPLE = 17,
    WECHAT_QRCODE = 33,
    WECHAT_PUB = 34,
    WECHAT_APP = 35,
    WECHAT_H5 = 36,
}
export declare abstract class Service {
    abstract prepare(cnt: InfoContent, cb: () => void): void;
    abstract auth(cnt: AuthContent): void;
    abstract login(cnt: LoginContent): void;
    abstract pay(cnt: PayContent): void;
    abstract share(cnt: ShareContent): void;
    abstract audio(cnt: AudioContent): void;
    abstract image(cnt: ImageContent): void;
    static IsValid(): boolean;
    static EVENT_SUCCESS: string;
    static EVENT_FAILED: string;
}
export declare abstract class Content extends EventDispatcher {
    proc: string;
}
export declare class InfoContent extends Content {
    logins: LoginMethod[];
    shares: ShareMethod[];
    pays: PayMethod[];
    uid: string;
    payload: IndexedObject;
}
export declare class AuthContent extends Content {
    proc: string;
    method: LoginMethod;
    targeturl?: string;
    refresh: boolean;
    uid: string;
    payload: IndexedObject;
}
export declare class LoginContent extends Content {
    proc: string;
    uid: string;
    payload: IndexedObject;
}
export declare enum ShareType {
    IMAGE = 1,
    WEBSITE = 2,
}
export declare class ShareContent extends Content {
    proc: string;
    method: ShareMethod;
    type: ShareType;
    title: string;
    desc: string;
    link: string;
    image: string;
}
export declare class PayContent extends Content {
    proc: string;
    method: PayMethod;
    orderid: string;
    item: string;
    price: number;
    desc: string;
    payload: IndexedObject;
}
export declare abstract class AudioRecorder {
    abstract start(cb?: (err: Error) => void): void;
    abstract stop(cb?: (media?: IMedia) => void): void;
    abstract play(cb?: (err: Error) => void): void;
}
export declare class AudioContent extends Content {
    proc: string;
    static RECORDER: number;
    acquire: number;
    recorder: AudioRecorder;
}
export declare abstract class ImagePicker {
    static ORIGIN: number;
    static COMPRESSED: number;
    static ALBUM: number;
    static CAMERA: number;
    count: number;
    size: number;
    source: number;
    abstract pick(suc: (images: IMedia[]) => void): void;
}
export declare abstract class ImagePresenter {
    current: string;
    urls: string[];
    abstract present(): void;
}
export declare class ImageContent extends Content {
    proc: string;
    static PICKER: number;
    static PRESENTER: number;
    acquire: number;
    picker: ImagePicker;
    presenter: ImagePresenter;
}
export declare function SdkGet(action: string, params: IndexedObject, suc: (data: IndexedObject) => void, error?: (err: Error) => void): void;
export declare function SdkPost(action: string, params: IndexedObject, files: IndexedObject, medias: IndexedObject, suc: (data: IndexedObject) => void, error?: (err: Error) => void): void;
