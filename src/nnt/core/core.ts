import {Capture} from "./v8";

export function static_cast<T>(l: any): T {
    return l;
}

export function GetClassName(clz: any): string {
    return clz.name;
}

export function GetObjectClassName(mdl: any): string {
    return mdl.constructor["name"];
}

let __static_vars = new Map<string, any>();

// 实现类似于C语言的static模式，当第一次使用时实例化，支持全局或者函数中
export function static_var<T>(init: () => T, ci = new Capture(2)): T {
    let key = ci.url() + ":" + ci.lineno();
    if (__static_vars.has(key)) {
        return __static_vars.get(key);
    }
    let obj = init();
    __static_vars.set(key, obj);
    return obj;
}

export function promise<T>(resolve_value: T = null): Promise<T> {
    return new Promise(resolve => {
        resolve(resolve_value);
    });
}

export function IsPureFunction(o: any): boolean {
    return typeof o == "function" &&
        o.hasOwnProperty("arguments") &&
        o.hasOwnProperty("caller");
}

export function IsClass(o: any): boolean {
    return typeof o == "function" &&
        !IsPureFunction(o);
}
