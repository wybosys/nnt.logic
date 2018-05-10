import {AnyClass, Class, IndexedObject} from "./kernel";
import {Config} from "../manager/config";

export interface IRouter {

    // router的标记
    action: string;

    // 接受配置文件的设置
    config?: (node: IndexedObject) => void;
}

// action可用的模式
export const debug = "debug";
export const develop = "develop";
export const local = "local";
export const devops = "devops";
export const devopsrelease = "devopsrelease";

// 打开频控
export const frqctl = "frqctl";

export interface ActionProto {

    // 绑定的模型类型
    clazz: AnyClass;

    // 限制debug可用
    debug?: boolean;

    // 限制develop可用
    develop?: boolean;

    // 限制local可用
    local?: boolean;

    // 限制devops可用
    devops?: boolean;

    // 限制devopsrelease可用
    devopsrelease?: boolean;

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
            (<IndexedObject>ap)[e] = true;
        });
    }
    return (target: any, key: string) => {
        let pass = true;
        // 判断是否需要判断可用性
        if (debug in ap ||
            develop in ap ||
            local in ap ||
            devops in ap ||
            devopsrelease in ap) {
            // 挨个判断
            pass = false;
            if (!pass && ap.debug) {
                if (Config.DEBUG)
                    pass = true;
            }
            if (!pass && ap.develop) {
                if (Config.DEVELOP)
                    pass = true;
            }
            if (!pass && ap.local) {
                if (Config.LOCAL)
                    pass = true;
            }
            if (!pass && ap.devops) {
                if (Config.DEVOPS)
                    pass = true;
            }
            if (!pass && ap.devopsrelease) {
                if (Config.DEVOPS_RELEASE)
                    pass = true;
            }
        }
        // 测试通过，该action生效
        if (pass)
            DefineAp(target, key, ap);
    };
}
