import {AnyClass, Class, IndexedObject} from "./kernel";
import {Config} from "../manager/config";

export interface IRouter {

    // router的标记
    action: string;
}

// action可用的模式
export const debug = "debug";
export const develop = "develop";

// 打开频控
export const frqctl = "frqctl";

export interface ActionProto {

    // 绑定的模型类型
    clazz: AnyClass;

    // 限制debug可用
    debug?: boolean;

    // 限制develop可用
    develop?: boolean;

    // 注释
    comment: string;

    // 打开频控
    frqctl?: boolean;
}

let AP_KEY = "__actionproto";

function DefineAp<T>(target: any, key: string, ap: ActionProto) {
    let aps: IndexedObject;
    if (target[AP_KEY]) {
        aps = target[AP_KEY];
    }
    else {
        aps = {};
        Object.defineProperty(target, AP_KEY, {
            enumerable: false,
            get: () => {
                return aps;
            }
        });
    }
    aps[key] = ap;
}

export function FindAction(target: any, key: string): ActionProto {
    let aps = target[AP_KEY];
    return aps ? aps[key] : null;
}

export function GetAllActionNames(obj: any): Array<string> {
    let aps = obj[AP_KEY];
    return aps ? Object.keys(aps) : [];
}

// 定义router需要的model对象
export function action<T>(model: Class<T>, options?: string[], comment?: string): (target: any, key: string) => void {
    let ap: ActionProto = {
        clazz: model,
        comment: comment
    };
    if (options) {
        options.forEach(e => {
            let io: IndexedObject = ap;
            if (e == debug)
                io["debug"] = true;
            else if (e == develop)
                io["develop"] = true;
            else if (e == frqctl)
                io["frqctl"] = true;
            else
                io[e] = true;
        });
    }
    return (target: any, key: string) => {
        let pass = false;
        if (ap.debug && Config.DEBUG)
            pass = true;
        else if (ap.develop && Config.DEVELOP)
            pass = true;
        else if (!ap.debug && !ap.develop)
            pass = true;
        if (pass)
            DefineAp(target, key, ap);
    };
}
