import { Base, SocketMethod } from "./model";
import { ErrorCallBack, SuccessCallback } from "./session";
import { CacheSession } from "./cachesession";
export declare class SocketSession extends CacheSession {
    method: SocketMethod;
    private _pool;
    private getConnector<T>(m);
    protected doFetch<T extends Base>(m: T, suc: SuccessCallback<T>, err: ErrorCallBack): void;
    listen<T extends Base>(m: T, suc: SuccessCallback<T>, err: ErrorCallBack): void;
    unlisten<T extends Base>(m: T, suc: SuccessCallback<T>, err: ErrorCallBack): void;
}
