"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var session_1 = require("./session");
var model_1 = require("./model");
var storage_1 = require("./storage");
var CacheSession = /** @class */ (function (_super) {
    __extends(CacheSession, _super);
    function CacheSession() {
        var _this = _super.call(this) || this;
        _this.openCache();
        return _this;
    }
    // 打开缓存
    CacheSession.prototype.openCache = function () {
        // 打开缓存
        if (storage_1.CacheStorage.IsValid)
            storage_1.CacheStorage.Open();
    };
    CacheSession.prototype.fetch = function (m, suc, err) {
        var _this = this;
        if (storage_1.CacheStorage.IsValid && m.cacheTime && !m.cacheFlush) {
            var key_1 = m.keyForCache();
            if (key_1 != null) {
                storage_1.CacheStorage.Get(key_1, m, function (obj) {
                    if (obj) {
                        m["_cacheUpdated"] = false;
                        model_1.Decode(m, obj);
                        suc && suc(m);
                    }
                    else {
                        // 缓存失败，则要先访问再更新一次缓存
                        _this.doFetch(m, function (m) {
                            // 更新缓存
                            m["_cacheUpdated"] = true;
                            storage_1.CacheStorage.Put(key_1, m);
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
    };
    return CacheSession;
}(session_1.Session));
exports.CacheSession = CacheSession;
