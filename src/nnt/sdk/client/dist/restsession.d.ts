import { ErrorCallBack, SuccessCallback } from "./session";
import { Base } from "./model";
import { CacheSession } from "./cachesession";
export declare class RestSession extends CacheSession {
    constructor();
    startWeakHeartbeat(): void;
    protected doFetch<T extends Base>(m: T, suc: SuccessCallback<T>, err: ErrorCallBack): void;
    listen<T extends Base>(m: T, suc: SuccessCallback<T>, err: ErrorCallBack): void;
    unlisten<T extends Base>(m: T, suc: SuccessCallback<T>, err: ErrorCallBack): void;
    protected weakHeartbeat(): void;
    private _weakRetrys;
}
