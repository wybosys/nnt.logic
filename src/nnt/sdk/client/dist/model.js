"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var session_1 = require("./session");
var utils_1 = require("./utils");
// 实现一个兼容map
var CMap = /** @class */ (function () {
    function CMap() {
        this._keys = new Array();
        this._vals = new Array();
        this._store = {};
    }
    CMap.prototype.set = function (k, v) {
        if (k in this._store) {
            var idx = this._store[k];
            this._vals[idx] = v;
        }
        else {
            var idx = this._vals.length;
            this._keys.push(k);
            this._vals.push(v);
            this._store[k] = idx;
        }
    };
    CMap.prototype.get = function (k) {
        var idx = this._store[k];
        if (idx == -1)
            return null;
        return this._vals[idx];
    };
    CMap.prototype.has = function (k) {
        return k in this._store;
    };
    CMap.prototype.delete = function (k) {
        if (k in this._store) {
            var idx = this._store[k];
            this._keys[idx] = null;
            this._vals[idx] = null;
            delete this._store[k];
        }
    };
    CMap.prototype.clear = function () {
        this._keys.length = 0;
        this._vals.length = 0;
        this._store = {};
    };
    CMap.prototype.forEach = function (cb) {
        var _this = this;
        this._keys.forEach(function (k, idx) {
            if (k === null)
                return;
            cb(_this._vals[idx], k);
        });
    };
    return CMap;
}());
exports.CMap = CMap;
if (typeof Map == "undefined")
    Map = CMap;
var HttpMethod;
(function (HttpMethod) {
    HttpMethod[HttpMethod["GET"] = 0] = "GET";
    HttpMethod[HttpMethod["POST"] = 1] = "POST";
})(HttpMethod = exports.HttpMethod || (exports.HttpMethod = {}));
var SocketMethod;
(function (SocketMethod) {
    SocketMethod[SocketMethod["JSON"] = 0] = "JSON";
    SocketMethod[SocketMethod["PROTOBUF"] = 1] = "PROTOBUF";
})(SocketMethod = exports.SocketMethod || (exports.SocketMethod = {}));
var RequestParams = /** @class */ (function () {
    function RequestParams() {
        this.fields = {};
        this.files = {};
        this.medias = {};
    }
    return RequestParams;
}());
exports.RequestParams = RequestParams;
var Base = /** @class */ (function () {
    function Base() {
        // 请求方式
        this.method = HttpMethod.GET;
        this.binary = SocketMethod.JSON;
        // 是否需要显示等待
        this.enableWaiting = true;
        this.additionParams = null;
        this.additionFiles = null;
        this.additionMedias = null;
        this.hashCode = Base._COUNTER++;
        this.cmid = this.hashCode + "@" + session_1.Session.CID;
    }
    // 显示等待的交互，客户端重载来实现具体的等待UI
    Base.prototype.showWaiting = function () {
        // pass
    };
    Base.prototype.hideWaiting = function () {
        // pass
    };
    Object.defineProperty(Base.prototype, "cacheUpdated", {
        get: function () {
            return this._cacheUpdated;
        },
        enumerable: true,
        configurable: true
    });
    Base.prototype.keyForCache = function () {
        var t = Encode(this);
        var s = [];
        for (var key in t) {
            var val = t[key];
            if (val == null)
                s.push("key=");
            else if (val instanceof File)
                return null; // 如果包含文件，则认为不支持缓存
            else
                s.push("key=" + val);
        }
        if (session_1.Session.SID)
            s.push(session_1.Session.SID);
        s.push(this.action);
        s.push(this.host);
        s.push(this.port);
        return utils_1.StringT.Hash(s.join("\x19\xaf")); // 用一个很特殊的数据分隔(0x19af是随便选的)
    };
    // 组装请求的参数集
    Base.prototype.requestParams = function () {
        var t = Encode(this);
        var r = new RequestParams();
        // 先设置额外的参数，使得徒手设置的参数优先级最高
        if (this.additionParams) {
            for (var k in this.additionParams) {
                var v = this.additionParams[k];
                if (typeof v == "object")
                    v = utils_1.toJson(v);
                r.fields[k] = v;
            }
        }
        if (this.additionFiles) {
            for (var k in this.additionFiles) {
                var v = this.additionFiles[k];
                r.files[k] = v;
            }
        }
        if (this.additionMedias) {
            for (var k in this.additionMedias) {
                var v = this.additionMedias[k];
                r.medias[k] = v;
            }
        }
        // 设置徒手参数
        for (var key in t) {
            var val = t[key];
            if (val == null)
                continue;
            if (val instanceof File) {
                r.files[key] = val;
            }
            else if (val.save) {
                r.medias[key] = val;
            }
            else {
                r.fields[key] = val;
            }
        }
        // 设置保留参数
        if (session_1.Session.SID)
            r.fields["_sid"] = session_1.Session.SID;
        r.fields["_cid"] = session_1.Session.CID;
        r.fields["_cmid"] = this.cmid;
        if (session_1.Session.NOC)
            r.fields["_noc"] = 1;
        return r;
    };
    // 处理响应的结果
    Base.prototype.parseData = function (data, suc, error) {
        if (data.data) {
            this.data = data.data;
            // 把data的数据写入model中
            Decode(this, this.data);
        }
        this.code = data.code == null ? -1 : data.code;
        if (this.code < 0) {
            error(new Error("错误码:" + this.code));
        }
        else {
            try {
                suc();
            }
            catch (err) {
                console.error(err);
                error(err);
            }
        }
    };
    // 构造一个请求对象
    Base.NewRequest = function (req) {
        var clz = req[1];
        var r = new clz();
        r.action = req[0];
        return r;
    };
    // 对应api.ts中生成的实现，用来在ClientSDK中使用到impl中的类
    Base.BindImpl = function (api, models, routers) {
        Base.Impl.api = api;
        Base.Impl.models = models;
        Base.Impl.routers = routers;
    };
    Base.string = function (id, opts, comment) {
        var fp = {
            id: id,
            val: "",
            input: opts.indexOf(Base.input) != -1,
            output: opts.indexOf(Base.output) != -1,
            optional: opts.indexOf(Base.optional) != -1,
            string: true,
            comment: comment
        };
        return function (target, key) {
            DefineFp(target, key, fp);
        };
    };
    Base.boolean = function (id, opts, comment) {
        var fp = {
            id: id,
            val: false,
            input: opts.indexOf(Base.input) != -1,
            output: opts.indexOf(Base.output) != -1,
            optional: opts.indexOf(Base.optional) != -1,
            boolean: true,
            comment: comment
        };
        return function (target, key) {
            DefineFp(target, key, fp);
        };
    };
    Base.integer = function (id, opts, comment) {
        var fp = {
            id: id,
            val: 0,
            input: opts.indexOf(Base.input) != -1,
            output: opts.indexOf(Base.output) != -1,
            optional: opts.indexOf(Base.optional) != -1,
            integer: true,
            comment: comment
        };
        return function (target, key) {
            DefineFp(target, key, fp);
        };
    };
    Base.double = function (id, opts, comment) {
        var fp = {
            id: id,
            val: 0.,
            input: opts.indexOf(Base.input) != -1,
            output: opts.indexOf(Base.output) != -1,
            optional: opts.indexOf(Base.optional) != -1,
            double: true,
            comment: comment
        };
        return function (target, key) {
            DefineFp(target, key, fp);
        };
    };
    // 定义数组
    Base.array = function (id, clz, opts, comment) {
        var fp = {
            id: id,
            input: opts.indexOf(Base.input) != -1,
            output: opts.indexOf(Base.output) != -1,
            optional: opts.indexOf(Base.optional) != -1,
            array: true,
            valtype: clz,
            comment: comment
        };
        return function (target, key) {
            DefineFp(target, key, fp);
        };
    };
    // 定义映射表
    Base.map = function (id, keytyp, valtyp, opts, comment) {
        var fp = {
            id: id,
            input: opts.indexOf(Base.input) != -1,
            output: opts.indexOf(Base.output) != -1,
            optional: opts.indexOf(Base.optional) != -1,
            map: true,
            keytype: keytyp,
            valtype: valtyp,
            comment: comment
        };
        return function (target, key) {
            DefineFp(target, key, fp);
        };
    };
    // json对象
    Base.json = function (id, opts, comment) {
        var fp = {
            id: id,
            input: opts.indexOf(Base.input) != -1,
            output: opts.indexOf(Base.output) != -1,
            optional: opts.indexOf(Base.optional) != -1,
            json: true,
            comment: comment
        };
        return function (target, key) {
            DefineFp(target, key, fp);
        };
    };
    // 使用其他类型
    Base.type = function (id, clz, opts, comment) {
        var fp = {
            id: id,
            input: opts.indexOf(Base.input) != -1,
            output: opts.indexOf(Base.output) != -1,
            optional: opts.indexOf(Base.optional) != -1,
            valtype: clz,
            comment: comment
        };
        return function (target, key) {
            DefineFp(target, key, fp);
        };
    };
    // 枚举
    Base.enumerate = function (id, clz, opts, comment) {
        var fp = {
            id: id,
            input: opts.indexOf(Base.input) != -1,
            output: opts.indexOf(Base.output) != -1,
            optional: opts.indexOf(Base.optional) != -1,
            valtype: clz,
            enum: true,
            comment: comment
        };
        return function (target, key) {
            DefineFp(target, key, fp);
        };
    };
    // 文件类型
    Base.file = function (id, opts, comment) {
        var fp = {
            id: id,
            input: opts.indexOf(Base.input) != -1,
            output: opts.indexOf(Base.output) != -1,
            optional: opts.indexOf(Base.optional) != -1,
            file: true,
            comment: comment
        };
        return function (target, key) {
            DefineFp(target, key, fp);
        };
    };
    Base.Impl = { api: null, models: null, routers: null };
    Base._COUNTER = 1;
    // --------------从core.proto中移植过来的
    Base.string_t = "string";
    Base.integer_t = "integer";
    Base.double_t = "double";
    Base.boolean_t = "boolean";
    // 可选的参数
    Base.optional = "optional";
    // 必须的参数，不提供则忽略
    Base.required = "required";
    // 输入输出
    Base.input = "input";
    Base.output = "output";
    return Base;
}());
exports.Base = Base;
var FP_KEY = "__fieldproto";
function CloneFps(fps) {
    var r = {};
    for (var k in fps) {
        r[k] = LightClone(fps[k]);
    }
    return r;
}
function LightClone(tgt) {
    var r = {};
    for (var k in tgt) {
        r[k] = tgt[k];
    }
    return r;
}
function DefineFp(target, key, fp) {
    var fps;
    if (target.hasOwnProperty(FP_KEY)) {
        fps = target[FP_KEY];
    }
    else {
        if (FP_KEY in target) {
            fps = CloneFps(target[FP_KEY]);
            for (var k in fps) {
                var fp_1 = fps[k];
                fp_1.id *= session_1.Session.MODEL_FIELDS_MAX;
            }
        }
        else {
            fps = {};
        }
        Object.defineProperty(target, FP_KEY, {
            enumerable: false,
            get: function () {
                return fps;
            }
        });
    }
    fps[key] = fp;
    Object.defineProperty(target, key, {
        value: fp.val,
        writable: true
    });
    // 生成get/set方法，便于客户端连写
    var proto = target.constructor.prototype;
    var nm = utils_1.StringT.UpcaseFirst(key);
    proto["get" + nm] = function () {
        return this[key];
    };
    proto["set" + nm] = function (val) {
        this[key] = val;
        return this;
    };
}
function GetFieldOptions(mdl) {
    return mdl[FP_KEY];
}
exports.GetFieldOptions = GetFieldOptions;
// 检查模型和输入数据的匹配情况，简化模式（不处理第二级）
function CheckInput(proto, params) {
    var fps = proto[FP_KEY];
    if (fps == null)
        return true;
    for (var key in fps) {
        var val = fps[key];
        if (val.input && !val.optional && !(key in params))
            return false;
    }
    return true;
}
exports.CheckInput = CheckInput;
exports.string_t = "string";
exports.integer_t = "integer";
exports.double_t = "double";
exports.boolean_t = "boolean";
// 填数据
function Decode(mdl, params) {
    var fps = mdl[FP_KEY];
    if (!fps)
        return;
    var _loop_1 = function (key) {
        var fp = fps[key];
        if (fp == null)
            return "continue";
        var val = params[key];
        if (fp.valtype) {
            if (fp.array) {
                var arr_1 = new Array();
                if (val) {
                    if (typeof (fp.valtype) == "string") {
                        if (fp.valtype == exports.string_t) {
                            val.forEach(function (e) {
                                arr_1.push(e ? e.toString() : null);
                            });
                        }
                        else if (fp.valtype == exports.integer_t) {
                            val.forEach(function (e) {
                                arr_1.push(e ? utils_1.toInt(e) : 0);
                            });
                        }
                        else if (fp.valtype == exports.double_t) {
                            val.forEach(function (e) {
                                arr_1.push(e ? utils_1.toFloat(e) : 0);
                            });
                        }
                        else if (fp.valtype == exports.boolean_t)
                            val.forEach(function (e) {
                                arr_1.push(!!e);
                            });
                    }
                    else {
                        var clz_1 = fp.valtype;
                        val.forEach(function (e) {
                            if (e == null) {
                                arr_1.push(null);
                            }
                            else {
                                var t = new clz_1();
                                Decode(t, e);
                                arr_1.push(t);
                            }
                        });
                    }
                }
                mdl[key] = arr_1;
            }
            else if (fp.map) {
                var keyconv = function (v) {
                    return v;
                };
                if (fp.keytype == exports.integer_t)
                    keyconv = utils_1.toInt;
                else if (fp.keytype == exports.double_t)
                    keyconv = utils_1.toFloat;
                var map = new Map();
                if (val) {
                    if (typeof (fp.valtype) == "string") {
                        if (fp.valtype == exports.string_t) {
                            for (var ek in val) {
                                var ev = val[ek];
                                map.set(keyconv(ek), ev ? ev.toString() : null);
                            }
                        }
                        else if (fp.valtype == exports.integer_t) {
                            for (var ek in val) {
                                var ev = val[ek];
                                map.set(keyconv(ek), ev ? utils_1.toInt(ev) : 0);
                            }
                        }
                        else if (fp.valtype == exports.double_t) {
                            for (var ek in val) {
                                var ev = val[ek];
                                map.set(keyconv(ek), ev ? utils_1.toFloat(ev) : 0);
                            }
                        }
                        else if (fp.valtype == exports.boolean_t)
                            for (var ek in val) {
                                var ev = val[ek];
                                map.set(keyconv(ek), !!ev);
                            }
                    }
                    else {
                        var clz = fp.valtype;
                        for (var ek in val) {
                            var ev = val[ek];
                            if (ev == null) {
                                map.set(keyconv(ek), null);
                            }
                            else {
                                var t = new clz();
                                Decode(t, ev);
                                map.set(keyconv(ek), t);
                            }
                        }
                    }
                }
                mdl[key] = map;
            }
            else if (fp.enum) {
                mdl[key] = val ? parseInt(val) : 0;
            }
            else if (fp.valtype == Object) {
                mdl[key] = val;
            }
            else if (val) {
                var clz = fp.valtype;
                var t = new clz();
                Decode(t, val);
                mdl[key] = t;
            }
        }
        else {
            if (fp.string)
                mdl[key] = val ? val.toString() : null;
            else if (fp.integer)
                mdl[key] = val ? utils_1.toInt(val) : 0;
            else if (fp.double)
                mdl[key] = val ? utils_1.toFloat(val) : 0;
            else if (fp.boolean)
                mdl[key] = toBoolean(val);
            else if (fp.json)
                mdl[key] = val;
            else if (fp.file)
                mdl[key] = val;
        }
    };
    for (var key in params) {
        _loop_1(key);
    }
    // 处理内置参数
    if ("_mid" in params)
        mdl["_mid"] = params["_mid"];
}
exports.Decode = Decode;
function toBoolean(v) {
    if (v == "true")
        return true;
    else if (v == "false")
        return false;
    return !!v;
}
exports.toBoolean = toBoolean;
// 把所有input的数据拿出来
function Encode(mdl) {
    var fps = mdl[FP_KEY];
    if (fps == null)
        return null;
    var r = {};
    for (var key in fps) {
        var fp = fps[key];
        if (!fp.input || !mdl.hasOwnProperty(key))
            continue;
        var v = mdl[key];
        if (v == null)
            continue;
        // 如果是对象，则需要在encode一次
        if (fp.valtype && !fp.enum && typeof fp.valtype != "string")
            r[key] = JSON.stringify(Encode(v));
        else
            r[key] = v;
    }
    return r;
}
exports.Encode = Encode;
// 收集model的输出
function Output(mdl) {
    if (!mdl)
        return {};
    var fps = mdl[FP_KEY];
    var r = {};
    var _loop_2 = function (fk) {
        var fp = fps[fk];
        if (!fp.output)
            return "continue";
        var val = mdl[fk];
        if (fp.valtype) {
            if (fp.array) {
                // 通用类型，则直接可以输出
                if (typeof (fp.valtype) == "string") {
                    r[fk] = val;
                }
                else {
                    // 特殊类型，需要迭代进去
                    var arr_2 = new Array();
                    val && val.forEach(function (e) {
                        arr_2.push(Output(e));
                    });
                    r[fk] = arr_2;
                }
            }
            else if (fp.map) {
                var m_1 = {};
                if (val) {
                    if (typeof (fp.valtype) == "string") {
                        val.forEach(function (v, k) {
                            m_1[k] = v;
                        });
                    }
                    else {
                        val.forEach(function (v, k) {
                            m_1[k] = Output(v);
                        });
                    }
                }
                r[fk] = m_1;
            }
            else if (fp.valtype == Object) {
                r[fk] = val;
            }
            else {
                r[fk] = Output(val);
            }
        }
        else {
            r[fk] = val;
        }
    };
    for (var fk in fps) {
        _loop_2(fk);
    }
    return r;
}
exports.Output = Output;
function mid_unparse(info) {
    var r = info.user + "@" + info.domain;
    if (info.resources && info.resources.length)
        r += "/" + info.resources.join("/");
    return r;
}
exports.mid_unparse = mid_unparse;
