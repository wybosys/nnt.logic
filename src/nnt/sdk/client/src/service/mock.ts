import {Session} from "../session";
import {
    AudioContent, AuthContent, ImageContent, InfoContent, LoginContent, PayContent, Service,
    ShareContent
} from "../service";
import {Base, IndexedObject} from "../model";

export class MockService extends Service {

    prepare(cnt: InfoContent, cb: () => void) {
        cb();
    }

    auth(cnt: AuthContent) {
        cnt.raiseEvent(Service.EVENT_SUCCESS);
    }

    login(cnt: LoginContent) {
        cnt.raiseEvent(Service.EVENT_SUCCESS);
    }

    pay(cnt: PayContent) {
        let jsobj: IndexedObject = {};
        // 直接调用服务端的接口完成支付
        let clz = Base.Impl.models["Null"];
        let m = new clz();
        m.action = "shop.done";
        m.additionParams = {tid: jsobj["tid"]};
        Session.Fetch(m, () => {
            cnt.raiseEvent(Service.EVENT_SUCCESS);
        }, err => {
            cnt.raiseEvent(Service.EVENT_FAILED, err);
        });
    }

    share(cnt: ShareContent) {
        cnt.raiseEvent(Service.EVENT_FAILED);
    }

    audio(cnt: AudioContent) {
        cnt.raiseEvent(Service.EVENT_FAILED);
    }

    image(cnt: ImageContent) {
        cnt.raiseEvent(Service.EVENT_FAILED);
    }
}
