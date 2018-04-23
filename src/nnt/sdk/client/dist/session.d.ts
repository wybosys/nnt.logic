import { Base, Paged } from "./model";
import { EventDispatcher } from "./eventdispatcher";
export declare type SuccessCallback<T> = (m: T) => void;
export declare type ErrorCallBack = (err: Error, resp?: any) => void;
export declare abstract class Session {
    static ISHTTPS: boolean;
    static EVENT_SID_CHANGED: string;
    abstract fetch<T extends Base>(m: T, suc: SuccessCallback<T>, err: ErrorCallBack): void;
    abstract listen<T extends Base>(m: T, suc: SuccessCallback<T>, err: ErrorCallBack): void;
    abstract unlisten<T extends Base>(m: T, suc: SuccessCallback<T>, err: ErrorCallBack): void;
    protected static _default: Session;
    page<T extends Paged & Base>(m: T, suc: SuccessCallback<T>, err: ErrorCallBack): void;
    setAsDefault(): void;
    static Fetch<T extends Base>(m: T, suc: SuccessCallback<T>, err?: ErrorCallBack): void;
    static Listen<T extends Base>(m: T, suc: SuccessCallback<T>, err?: ErrorCallBack): void;
    static Unlisten<T extends Base>(m: T, suc: SuccessCallback<T>, err?: ErrorCallBack): void;
    static Page<T extends Paged & Base>(m: T, suc: SuccessCallback<T>, err?: ErrorCallBack): void;
    static CID: number;
    private static _SID;
    static SID: string;
    static NOC: boolean;
    static MODEL_FIELDS_MAX: number;
    static CACHE_DB: string;
    static PAGE_LEN: number;
    static LOCATION: string;
    static CHANNEL: string;
    static EVENT: EventDispatcher;
}
