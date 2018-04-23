"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var session_1 = require("./session");
var utils_1 = require("./utils");
var CacheTime;
(function (CacheTime) {
    CacheTime[CacheTime["MINUTE"] = 60] = "MINUTE";
    CacheTime[CacheTime["HOUR"] = 3600] = "HOUR";
    CacheTime[CacheTime["DAY"] = 86400] = "DAY";
})(CacheTime = exports.CacheTime || (exports.CacheTime = {}));
var CacheRecord = /** @class */ (function () {
    function CacheRecord() {
    }
    return CacheRecord;
}());
var CacheStorage = /** @class */ (function () {
    function CacheStorage() {
    }
    // 打开缓存
    CacheStorage.Open = function () {
        var _this = this;
        if (this._hdl)
            return;
        this._hdl = window.indexedDB.open(session_1.Session.CACHE_DB);
        this._hdl.onerror = function (e) {
            console.error(e);
        };
        this._hdl.onsuccess = function (e) {
            _this._db = e.target.result;
        };
        this._hdl.onupgradeneeded = function (e) {
            var db = e.target.result;
            if (!db.objectStoreNames.contains("::caches::")) {
                db.createObjectStore("::caches::", { keyPath: "key" });
            }
        };
    };
    // 添加缓存
    CacheStorage.Put = function (key, mdl) {
        if (key == null)
            return;
        var ta = this._db.transaction("::caches::", 'readwrite');
        var st = ta.objectStore("::caches::");
        var t = new CacheRecord();
        t.key = key;
        t.obj = mdl.data;
        t.expire = utils_1.timestamp() + mdl.cacheTime;
        st.put(t);
    };
    // 获得缓存
    CacheStorage.Get = function (key, mdl, cb) {
        if (key == null) {
            cb(null);
            return null;
        }
        var ta = this._db.transaction("::caches::", 'readonly');
        var st = ta.objectStore("::caches::");
        var fnd = st.get(key);
        fnd.onsuccess = function (e) {
            var rcd = e.target.result;
            if (rcd == null) {
                cb(null);
                return;
            }
            var now = utils_1.timestamp();
            if (rcd.expire < now) {
                // 已经过期
                cb(null);
            }
            else {
                cb(rcd.obj);
            }
        };
        fnd.onerror = function (e) {
            cb(null);
        };
    };
    // 是否可用
    CacheStorage.IsValid = window.indexedDB != null;
    CacheStorage._version = 1;
    return CacheStorage;
}());
exports.CacheStorage = CacheStorage;
