import {ErrorCallBack, Session, SuccessCallback} from "./session";
import {Base, Decode} from "./model";
import {CacheStorage} from "./storage";

export abstract class CacheSession extends Session {

    constructor() {
        super();
        this.openCache();
    }

    // 打开缓存
    openCache() {
        // 打开缓存
        if (CacheStorage.IsValid)
            CacheStorage.Open();
    }

    fetch<T extends Base>(m: T, suc: SuccessCallback<T>, err: ErrorCallBack) {
        if (CacheStorage.IsValid && m.cacheTime && !m.cacheFlush) {
            let key = m.keyForCache();
            if (key != null) {
                CacheStorage.Get(key, m, obj => {
                    if (obj) {
                        m["_cacheUpdated"] = false;
                        Decode(m, obj);
                        suc && suc(m);
                    }
                    else {
                        // 缓存失败，则要先访问再更新一次缓存
                        this.doFetch(m, (m) => {
                            // 更新缓存
                            m["_cacheUpdated"] = true;
                            CacheStorage.Put(key, m);
                            suc && suc(m);
                        }, err);
                    }
                });
            }
            else {
                this.doFetch(m, suc, err);
            }
        }
        else {
            this.doFetch(m, suc, err);
        }
    }

    protected abstract doFetch<T extends Base>(m: T, suc: SuccessCallback<T>, err: ErrorCallBack): void;

}
