import { ErrorCallBack, Session, SuccessCallback } from "./session";
import { Base } from "./model";
export declare abstract class CacheSession extends Session {
    constructor();
    openCache(): void;
    fetch<T extends Base>(m: T, suc: SuccessCallback<T>, err: ErrorCallBack): void;
    protected abstract doFetch<T extends Base>(m: T, suc: SuccessCallback<T>, err: ErrorCallBack): void;
}
