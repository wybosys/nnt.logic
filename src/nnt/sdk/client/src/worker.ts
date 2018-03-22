import {LoadLibrary} from "./library";
import {IndexedObject} from "./model";

export function WorkerFromString(str: string): Worker {
    let b = new Blob([str], {type: 'application/javascript'});
    let url = window.URL.createObjectURL(b);
    return new Worker(url);
}

let services: IndexedObject = {};

// 使用providerid启动一个服务，该worker的代码保存在服务器上
export function StartService(id: string, cb: (w: Worker) => void) {
    if (id in services) {
        cb(services[id]);
        return;
    }
    LoadLibrary(id, objurl => {
        if (!objurl) {
            services[id] = null;
            cb(null);
            return;
        }
        try {
            let work = new Worker(objurl);
            services[id] = work;
            cb(work);
        }
        catch (err) {
            services[id] = null;
            cb(null);
        }
    });
}