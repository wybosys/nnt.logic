import { ErrorCallBack, Session, SuccessCallback } from "./session";
import { Base } from "./model";
import { SocketSession } from "./socketsession";
export declare type mid_t = string;
export interface MidInfo {
    user: string;
    domain: string;
    resources?: string[];
}
export declare function mid_parse(mid: mid_t): MidInfo;
export declare function mid_unparse(info: MidInfo): mid_t;
export declare class ImRestSession extends Session {
    constructor();
    fetch<T extends Base>(m: T, suc: SuccessCallback<T>, err: ErrorCallBack): void;
    listen<T extends Base>(m: T, suc: SuccessCallback<T>, err: ErrorCallBack): void;
    unlisten<T extends Base>(m: T, suc: SuccessCallback<T>, err: ErrorCallBack): void;
}
export declare class ImWsSession extends SocketSession {
    fetch<T extends Base>(m: T, suc: SuccessCallback<T>, err: ErrorCallBack): void;
    listen<T extends Base>(m: T, suc: SuccessCallback<T>, err: ErrorCallBack): void;
}
export declare let _ImSessionImpl: typeof ImWsSession;
export declare class ImSession extends _ImSessionImpl {
    send<T extends Base>(m: T, suc: SuccessCallback<T>, err: ErrorCallBack): void;
}
