import process = require("process");
import ph = require("path");
import {logger} from "./logger";
import {ArrayT} from "./kernel";

// 当前的运行目录
let ROOT = ph.resolve('/');
let HOME = process.cwd();

export function home(): string {
    return HOME;
}

let schemes = new Map<string, (body: string) => string>();

// 注册处理器
export function RegisterScheme(scheme: string, proc: (body: string) => string) {
    schemes.set(scheme, proc);
}

// 展开url
// 如果包含 :// 则拆分成 scheme 和 body，再根绝 scheme 注册的转换器转换
// 否则按照 / 来打断各个部分，再处理 ~、/ 的设置
export function expand(url: string): string {
    if (url.indexOf("://") != -1) {
        let ps = url.split("://");
        let proc = schemes.get(ps[0]);
        if (proc == null) {
            logger.fatal("没有注册该类型{{=it.scheme}}的处理器", {scheme: ps[0]});
            return null;
        }
        return proc(ps[1]);
    }

    let ps = url.split("/");
    if (ps[0] == "~")
        ps[0] = HOME;
    else if (ps[0] == "")
        ps[0] = ROOT;
    else {
        return ph.resolve(url);
    }
    return ps.join("/");
}

// 定义path展开的包装
export function pathd(): (target: Object, key: string) => void {
    return (target: Object, key: string): void => {
        let vk = "__" + key;
        Object.defineProperty(target, key, {
            get: () => {
                return this[vk];
            },
            set: (v: string) => {
                this[vk] = expand(v);
            }
        });
    };
}

// 自动解码SID，简化工作量
export function SmartDecodeSessionID(sid: string): string {
    if (sid.indexOf('%') == -1)
        return sid;
    return decodeURIComponent(sid);
}

// 注册普通的url请求
RegisterScheme("http", body => body);
RegisterScheme("https", body => body);
