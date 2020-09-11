import {Base, ModelError} from "./model";
import {logger} from "../core/logger";
import {SObject} from "../core/object";
import {
    kSignalClose,
    kSignalConnected,
    kSignalDataChanged,
    kSignalEnd,
    kSignalFailed,
    kSignalOpen,
    kSignalReopen,
    kSignalSucceed,
    kSignalTimeout,
    Slot
} from "../core/signals";


export type SuccessCallback<T> = (m: T) => void;
export type ErrorCallBack = (err: ModelError, resp?: any) => void;

export abstract class Session {

    // 获取一个模型
    abstract fetch<T extends Base>(m: T, suc: SuccessCallback<T>, err?: ErrorCallBack): void;

    protected static shared: Session;

    // 遇到错误抛出异常
    static Fetch<T extends Base>(m: T): Promise<T> {
        return new Promise((resolve, reject) => {
            this.shared.fetch(m, m => {
                resolve(m);
            }, err => {
                reject(err);
            });
        });
    }

    // 遇到错误，返回null
    static Get<T extends Base>(m: T): Promise<T> {
        return new Promise((resolve) => {
            this.shared.fetch(m, m => {
                resolve(m);
            }, err => {
                logger.log(err.message);
                resolve(null);
            });
        });
    }
}

export abstract class AbstractSocketConnector extends SObject {

    // 连接地址
    host: string;

    protected _initSignals() {
        super._initSignals();
        this._signals.register(kSignalOpen);
        this._signals.register(kSignalClose);
        this._signals.register(kSignalDataChanged);
        this._signals.register(kSignalTimeout);
        this._signals.register(kSignalFailed);
        this._signals.register(kSignalReopen);
    }

    /** 是否已经打开 */
    abstract isopened(): boolean;

    /** 连接服务器 */
    abstract open(): void;

    /** 断开连接 */
    abstract close(): void;

    /** 发送对象 */
    abstract write(obj: any): void;

    /** 监听对象 */
    abstract watch(obj: any, on: boolean): void;
}

// 用于socket通信的session
export abstract class AbstractSocketSession extends SObject {

    protected _initSignals() {
        super._initSignals();
        this._signals.register(kSignalOpen);
        this._signals.register(kSignalConnected);
        this._signals.register(kSignalClose);
        this._signals.register(kSignalTimeout);
        this._signals.register(kSignalEnd);
        this._signals.register(kSignalSucceed);
        this._signals.register(kSignalFailed);
    }

    // 监听模型
    abstract watch(mdl: Base, cb?: (s?: Slot) => void, cbctx?: any): void;

    // 取消监听模型
    abstract unwatch(mdl: Base): void;

    // 获取模型数据
    abstract fetch(mdl: Base, cb?: (s?: Slot) => void, cbctx?: any, cbfail?: (s?: Slot) => void, cbend?: () => void): void;

    // 服务器地址
    host: string;

    // sessionId
    SID: string;

    // 打开连接
    abstract open(): void;
}
