import uuidv4 = require('uuid/v4');
import fs = require("fs");
import {Capture} from "./v8";
import {logger} from "./logger";
import {REGEX_JS} from "../component/pattern";
import crypto = require("crypto");

export function static_cast<T>(l: any): T {
    return <T>l;
}

export function PushModule(l: any, r: any) {
    for (let k in r)
        l[k] = r[k];
}

export function Require(nm: string, each?: (e: any) => void) {
    let t: any;
    try {
        t = require(nm);
    } catch (err) {
        logger.error(err);
    }
    if (each && t) {
        for (let k in t) {
            each(t[k]);
        }
    }
}

export function RequireDirectory(dir: string) {
    let files = fs.readdirSync(dir);
    files.forEach(e => {
        let ph = dir + "/" + e;
        let st = fs.statSync(ph);
        if (st.isFile()) {
            if (e.match(REGEX_JS))
                Require(ph);
        } else if (st.isDirectory()) {
            RequireDirectory(ph);
        }
    });
}

export function GetClassName(clz: any): string {
    return clz.name;
}

export function GetObjectClassName(mdl: any): string {
    return mdl.constructor["name"];
}

export function UUID(): string {
    return uuidv4().replace(/-/g, "");
}

export function MD5(str: string, format: 'hex' | 'base64' = 'hex'): string {
    return crypto.createHash('md5').update(str).digest(format);
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
