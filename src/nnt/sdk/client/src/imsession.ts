import {ErrorCallBack, Session, SuccessCallback} from "./session";
import {Base} from "./model";
import {ArrayT, StringT} from "./utils";
import {SocketSession} from "./socketsession";

export type mid_t = string;

export interface MidInfo {
    user: string;
    domain: string;
    resources?: string[];
}

export function mid_parse(mid: mid_t): MidInfo {
    if (!mid)
        return null;
    let p = mid.split("/");
    let p0 = p[0].split("@");
    if (p0.length != 2)
        return null;
    return {
        user: p0[0],
        domain: StringT.Lowercase(p0[1]),
        resources: ArrayT.RangeOf(p, 1)
    };
}

export function mid_unparse(info: MidInfo): mid_t {
    let r = info.user + "@" + info.domain;
    if (info.resources)
        r += "/" + info.resources.join("/");
    return r;
}

export class ImRestSession extends Session {

    constructor() {
        super();
    }

    fetch<T extends Base>(m: T, suc: SuccessCallback<T>, err: ErrorCallBack) {
        if (!m.action)
            m.action = "im.send";
        m.enableWaiting = false;
        m.cacheTime = 0;
        Session._default.fetch(m, suc, err);
    }

    listen<T extends Base>(m: T, suc: SuccessCallback<T>, err: ErrorCallBack) {
        if (!m.action)
            m.action = "im.receive";
        m.enableWaiting = false;
        m.cacheTime = 0;
        Session._default.listen(m, suc, err);
    }

    unlisten<T extends Base>(m: T, suc: SuccessCallback<T>, err: ErrorCallBack) {
        Session._default.unlisten(m, suc, err);
    }
}

export class ImWsSession extends SocketSession {

    fetch<T extends Base>(m: T, suc: SuccessCallback<T>, err: ErrorCallBack) {
        if (!m.action)
            m.action = "im.send";
        m.enableWaiting = false;
        m.cacheTime = 0;
        super.fetch(m, suc, err);
    }

    listen<T extends Base>(m: T, suc: SuccessCallback<T>, err: ErrorCallBack) {
        if (!m.action)
            m.action = "im.receive";
        m.enableWaiting = false;
        m.cacheTime = 0;
        super.listen(m, suc, err);
    }
}

// 用rest实现的im服务，以后其他方式实现后再切换
//export let _ImSessionImpl = ImRestSession;
export let _ImSessionImpl = ImWsSession;

export class ImSession extends _ImSessionImpl {

    send<T extends Base>(m: T, suc: SuccessCallback<T>, err: ErrorCallBack) {
        this.fetch(m, suc, err);
    }
}