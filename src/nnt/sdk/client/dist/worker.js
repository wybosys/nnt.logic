"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var library_1 = require("./library");
function WorkerFromString(str) {
    var b = new Blob([str], { type: 'application/javascript' });
    var url = window.URL.createObjectURL(b);
    return new Worker(url);
}
exports.WorkerFromString = WorkerFromString;
var services = {};
// 使用providerid启动一个服务，该worker的代码保存在服务器上
function StartService(id, cb) {
    if (id in services) {
        cb(services[id]);
        return;
    }
    library_1.LoadLibrary(id, function (objurl) {
        if (!objurl) {
            services[id] = null;
            cb(null);
            return;
        }
        try {
            var work = new Worker(objurl);
            services[id] = work;
            cb(work);
        }
        catch (err) {
            services[id] = null;
            cb(null);
        }
    });
}
exports.StartService = StartService;
