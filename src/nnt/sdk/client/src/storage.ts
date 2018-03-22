import {Session} from "./session";
import {Base} from "./model";
import {timestamp} from "./utils";

export enum CacheTime {
    MINUTE = 60,
    HOUR = 60 * 60,
    DAY = 60 * 60 * 24,
}

class CacheRecord {
    // 键值
    key: number;

    // 期望的过期时间
    expire: number;

    // 保存的对象
    obj: any;
}

export class CacheStorage {

    // 是否可用
    static IsValid: boolean = window.indexedDB != null;

    // 打开缓存
    static Open() {
        if (this._hdl)
            return;
        this._hdl = window.indexedDB.open(Session.CACHE_DB);
        this._hdl.onerror = (e: any) => {
            console.error(e)
        };
        this._hdl.onsuccess = (e: any) => {
            this._db = e.target.result;
        };
        this._hdl.onupgradeneeded = (e: any) => {
            let db = e.target.result;
            if (!db.objectStoreNames.contains("::caches::")) {
                db.createObjectStore("::caches::", {keyPath: "key"});
            }
        };
    }

    // 添加缓存
    static Put(key: number, mdl: Base) {
        if (key == null)
            return;
        let ta = this._db.transaction("::caches::", 'readwrite');
        let st = ta.objectStore("::caches::");
        let t = new CacheRecord();
        t.key = key;
        t.obj = mdl.data;
        t.expire = timestamp() + mdl.cacheTime;
        st.put(t);
    }

    // 获得缓存
    static Get(key: number, mdl: Base, cb: (obj: any) => void): any {
        if (key == null) {
            cb(null);
            return null;
        }
        let ta = this._db.transaction("::caches::", 'readonly');
        let st = ta.objectStore("::caches::");
        let fnd = st.get(key);
        fnd.onsuccess = (e: any) => {
            let rcd: CacheRecord = e.target.result;
            if (rcd == null) {
                cb(null);
                return;
            }
            let now = timestamp();
            if (rcd.expire < now) {
                // 已经过期
                cb(null);
            }
            else {
                cb(rcd.obj);
            }
        };
        fnd.onerror = (e: any) => {
            cb(null);
        };
    }

    static _hdl: IDBOpenDBRequest;
    static _version = 1;
    static _db: any;
}