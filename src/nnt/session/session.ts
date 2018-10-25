import {Base, ModelError} from "./model";

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
                resolve(null);
            });
        });
    }
}
