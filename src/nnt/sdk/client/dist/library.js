"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var model_1 = require("./model");
var session_1 = require("./session");
// 第三方库的管理器
// 加载第三方库，返回的是urlobject
function load(id, cb) {
    var clz = model_1.Base.Impl.models["ProviderContent"];
    var m = new clz();
    m.action = "provider.use";
    m.type = 0; // 使用js格式来加载
    m.id = id;
    session_1.Session.Fetch(m, function () {
    }, function (e, resp) {
        if (!resp) {
            cb(null);
            return;
        }
        if (resp.type != 'application/javascript') {
            cb(null);
            return;
        }
        // 从js创建urlobj
        try {
            var blob = new Blob([resp.data], { type: 'application/javascript' });
            var obj = URL.createObjectURL(blob);
            cb(obj);
        }
        catch (err) {
            console.error(err);
            cb(null);
        }
    });
}
var libs = {};
function LoadLibrary(id, cb) {
    if (id in libs) {
        cb(libs[id]);
    }
    else {
        load(id, function (objurl) {
            libs[id] = objurl;
            cb(objurl);
        });
    }
}
exports.LoadLibrary = LoadLibrary;
