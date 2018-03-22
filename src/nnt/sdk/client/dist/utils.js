"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function SafeNumber(o, def) {
    if (def === void 0) { def = 0; }
    return isNaN(o) ? def : o;
}
/** 转换到 float */
function toFloat(o, def) {
    if (def === void 0) { def = 0; }
    if (o == null)
        return def;
    var tp = typeof (o);
    if (tp == 'number')
        return SafeNumber(o, def);
    if (tp == 'string') {
        var v = parseFloat(o);
        return SafeNumber(v, def);
    }
    if (o.toNumber)
        return o.toNumber();
    return def;
}
exports.toFloat = toFloat;
exports.MAX_INT = 0x7fffffff;
exports.MIN_INT = -exports.MAX_INT;
/** 转换到 int */
function toInt(o, def) {
    if (def === void 0) { def = 0; }
    if (o == null)
        return def;
    var tp = typeof (o);
    if (tp == 'number' || tp == 'string') {
        var v = Number(o);
        // 不使用 >>0 整数化的原因是bigint会被限制到32位
        v = SafeNumber(v, def);
        if (v < exports.MAX_INT && v > -exports.MAX_INT)
            return v >> 0;
        return v; // 超大数的时候int或者float已经并不重要
    }
    if (o.toNumber) {
        var v = o.toNumber();
        if (v < exports.MAX_INT && v > -exports.MAX_INT)
            return v >> 0;
        return v;
    }
    return def;
}
exports.toInt = toInt;
/** 转换到数字
 @brief 如果对象不能直接转换，会尝试调用对象的 toNumber 进行转换
 */
function toNumber(o, def) {
    if (def === void 0) { def = 0; }
    if (o == null)
        return def;
    var tp = typeof (o);
    if (tp == 'number')
        return SafeNumber(o, def);
    if (tp == 'string') {
        if (o.indexOf('.') == -1) {
            var v_1 = parseInt(o);
            return SafeNumber(v_1, def);
        }
        var v = parseFloat(o);
        return SafeNumber(v, def);
    }
    if (o.toNumber)
        return o.toNumber();
    return def;
}
exports.toNumber = toNumber;
var Random = /** @class */ (function () {
    function Random() {
    }
    Random.Rangef = function (from, to) {
        return Math.random() * (to - from) + from;
    };
    Random.Rangei = function (from, to, close) {
        if (close === void 0) { close = false; }
        if (close)
            return Math.round(Random.Rangef(from, to));
        return Math.floor(Random.Rangef(from, to));
    };
    return Random;
}());
exports.Random = Random;
var ArrayT = /** @class */ (function () {
    function ArrayT() {
    }
    /** 取得一段 */
    ArrayT.RangeOf = function (arr, pos, len) {
        var n = arr.length;
        if (pos < 0) {
            pos = n + pos;
            if (pos < 0)
                return arr;
        }
        if (pos >= n)
            return [];
        var c = len == null ? n : pos + len;
        return arr.slice(pos, c);
    };
    ArrayT.RemoveObject = function (arr, obj) {
        if (obj == null || arr == null)
            return false;
        var idx = arr.indexOf(obj);
        if (idx == -1)
            return false;
        arr.splice(idx, 1);
        return true;
    };
    ArrayT.Convert = function (arr, to, skipnull) {
        if (skipnull === void 0) { skipnull = false; }
        var r = new Array();
        arr && arr.forEach(function (e, idx) {
            var t = to(e, idx);
            if (!t && skipnull)
                return;
            r.push(t);
        });
        return r;
    };
    ArrayT.AsyncForeach = function (arr, each, complete) {
        var tmp = arr.concat();
        var i = 0, l = tmp.length;
        function proc() {
            if (i++ == l) {
                complete();
                return;
            }
            each(proc, tmp[i], i);
        }
        proc();
    };
    ArrayT.AsyncConvert = function (arr, cvt, complete) {
        var tmp = arr.concat();
        var i = 0, l = tmp.length;
        var r = new Array();
        if (i == l) {
            complete(r);
            return;
        }
        function proc(obj) {
            r.push(obj);
            if (i++ == l) {
                complete(r);
                return;
            }
            cvt(proc, tmp[i], i);
        }
        // 处理第一个
        cvt(proc, tmp[i], i++);
    };
    return ArrayT;
}());
exports.ArrayT = ArrayT;
var ObjectT = /** @class */ (function () {
    function ObjectT() {
    }
    ObjectT.SeqForin = function (obj, proc, complete) {
        var keys = Object.keys(obj);
        var i = 0, l = keys.length;
        function next(ret) {
            if (i < l) {
                var c = i++;
                proc(obj[keys[c]], keys[c], next);
            }
            else {
                complete(ret);
            }
        }
        next();
    };
    return ObjectT;
}());
exports.ObjectT = ObjectT;
var StringT = /** @class */ (function () {
    function StringT() {
    }
    // 选择响度速度快的，主要是在sdk中，对碰撞的容忍度较高
    StringT.Hash = function (str) {
        var r = 0;
        if (str.length === 0)
            return r;
        for (var i = 0; i < str.length; i++) {
            var chr = str.charCodeAt(i);
            r = ((r << 5) - r) + chr;
            r |= 0;
        }
        return r;
    };
    // 小写化
    StringT.Lowercase = function (str, def) {
        if (def === void 0) { def = ""; }
        return str ? str.toLowerCase() : def;
    };
    StringT.Uppercase = function (str, def) {
        if (def === void 0) { def = ""; }
        return str ? str.toUpperCase() : def;
    };
    StringT.UpcaseFirst = function (str) {
        if (!str || !str.length)
            return "";
        return str[0].toUpperCase() + str.substr(1);
    };
    return StringT;
}());
exports.StringT = StringT;
function timestamp() {
    return new Date().getTime() / 1000 >> 0;
}
exports.timestamp = timestamp;
var NAVIGATOR = typeof navigator == "undefined" ? null : navigator;
if (typeof navigator == "undefined") {
    var t = {
        appVersion: ""
    };
    NAVIGATOR = t;
}
var Device = /** @class */ (function () {
    function Device() {
    }
    Device.IOS = /iPad|iPhone|iPod/.test(NAVIGATOR.appVersion);
    return Device;
}());
exports.Device = Device;
function toJsonObject(o, def) {
    if (def === void 0) { def = null; }
    var t = typeof (o);
    if (t == 'string') {
        var r = void 0;
        try {
            r = JSON.parse(o);
        }
        catch (err) {
            //console.warn(o + " " + err);
            r = def;
        }
        return r;
    }
    else if (t == 'object')
        return o;
    return def;
}
exports.toJsonObject = toJsonObject;
function toJson(o, def) {
    if (def === void 0) { def = null; }
    var r;
    try {
        r = JSON.stringify(o);
    }
    catch (err) {
        r = def;
    }
    return r;
}
exports.toJson = toJson;
// 计算重试的时间
function RetryTime(retrys) {
    return Math.log(retrys) + 1;
}
exports.RetryTime = RetryTime;
function InstanceXmlHttpRequest() {
    return new XMLHttpRequest();
}
exports.InstanceXmlHttpRequest = InstanceXmlHttpRequest;
function LoadJs(id, url, suc) {
    var ele = document.createElement("script");
    ele.type = "text/javascript";
    ele.id = id;
    ele.src = url;
    ele.onload = suc;
    document.head.appendChild(ele);
}
exports.LoadJs = LoadJs;
var Mask = /** @class */ (function () {
    function Mask() {
    }
    Mask.Set = function (value, mask) {
        if (this.Has(value, mask))
            return value;
        return value | mask;
    };
    Mask.Unset = function (value, mask) {
        if (!this.Has(value, mask))
            return value;
        return value ^ mask;
    };
    Mask.Has = function (value, mask) {
        return (value & mask) == mask;
    };
    return Mask;
}());
exports.Mask = Mask;
var Queue = /** @class */ (function () {
    function Queue() {
        this._store = new Array();
    }
    Queue.prototype.add = function (func) {
        this._store.push(func);
        return this;
    };
    Queue.prototype.run = function () {
        var iter = this._store.entries();
        this.doIter(iter);
    };
    Queue.prototype.doIter = function (iter) {
        var _this = this;
        var val = iter.next();
        if (val.done)
            return;
        val.value[1](function () {
            _this.doIter(iter);
        });
    };
    return Queue;
}());
exports.Queue = Queue;
function Retry(cond, proc, interval, delta) {
    if (interval === void 0) { interval = 1; }
    if (delta === void 0) { delta = 2; }
    if (!cond()) {
        setTimeout(function () {
            Retry(cond, proc, interval + delta, delta);
        }, interval * 1000);
    }
    else {
        proc();
    }
}
exports.Retry = Retry;
