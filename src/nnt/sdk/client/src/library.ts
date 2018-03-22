import {Base, IndexedObject} from "./model";
import {Session} from "./session";

// 第三方库的管理器

// 加载第三方库，返回的是urlobject
function load(id: string, cb: (objurl: string) => void) {
    let clz = Base.Impl.models["ProviderContent"];
    let m = new clz();
    m.action = "provider.use";
    m.type = 0; // 使用js格式来加载
    m.id = id;
    Session.Fetch(m, () => {
    }, (e, resp) => {
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
            let blob = new Blob([resp.data], {type: 'application/javascript'});
            let obj = URL.createObjectURL(blob);
            cb(obj);
        }
        catch (err) {
            console.error(err);
            cb(null);
        }
    });
}

let libs: IndexedObject = {};

export function LoadLibrary(id: string, cb: (objurl: string) => void) {
    if (id in libs) {
        cb(libs[id]);
    }
    else {
        load(id, objurl => {
            libs[id] = objurl;
            cb(objurl);
        });
    }
}