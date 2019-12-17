import sharp = require("sharp");
import {sep} from "path";
import {logger} from "../../core/logger";
import {ArrayT} from "../../core/kernel";
import {FileInfo} from "../fileinfo";

export type image_t = sharp.Sharp;

let PAT_FILTERS = /([0-9a-zA-Z]+)\(([0-9a-zA-Z,\. ]*)\)\.?/g;
let PAT_FILTER = /([0-9a-zA-Z]+)\(([0-9a-zA-Z,\. ]*)\)\.?/;

// Windows下需要安装 node-gyp windows-build-tools
// 滤镜处理器
export class Filter {

    // 滤镜格式为类似函数 scale(a, b, c, d)
    parse(cfg: string): boolean {
        let grps = cfg.match(PAT_FILTERS);
        if (!grps)
            return false;
        for (let i = 0, l = grps.length; i < l; ++i) {
            let grp = grps[i];
            let res = grp.match(PAT_FILTER);
            if (!res)
                return false;
            let f = filters.get(res[1]);
            if (!f) {
                logger.warn("没有找到指定的ImageFilter {{=it.name}}", {name: res[1]});
                return false;
            }
            if (!f.init(this, res[2].split(","))) {
                logger.warn("ImageFilter初始化失败 {{=it.args}}", {args: res[0]});
                return false;
            }
            this.filters.push(f);
        }
        return true;
    }

    filters = new Array<ImageFilter>();
    params = new Array<Object>();
    hashs = new Array<string>();

    get hash(): string {
        return this.hashs.join("__");
    }

    // 滤镜处理
    process(info: FileInfo, cb: (err: Error) => void) {
        let input = sharp(info.input);
        ArrayT.SeqForeach(this.filters, (e, idx, next) => {
            let p = this.params[idx];
            e.proc(p, input, next, info);
        }, (output: image_t) => {
            if (!output) {
                cb(new Error("转换图片失败"));
            }
            else {
                output.toFile(info.output, (err, info) => {
                    if (err)
                        logger.warn(err.message);
                    cb(err);
                });
            }
        });
    }
}

export abstract class ImageFilter {
    // filter类型
    action: string;

    // 初始化filter
    abstract init(f: Filter, params: any[]): boolean;

    // 图片处理
    abstract proc(params: any, input: image_t, cb: (output: image_t) => void, info: FileInfo): void;
}

let filters = new Map<string, ImageFilter>();

export function RegisterImageFilter(obj: ImageFilter) {
    filters.set(obj.action, obj);
}

// 注册滤镜，必须放到最后面
import {Gray} from "./gray";
import {Scale} from "./scale";
import {Resize} from "./resize";
import {Quality} from "./quality";
import {Blur} from "./blur";
import {Gridscale} from "./gridscale";
import {Roundlize} from "./roundlize";

RegisterImageFilter(new Gray());
RegisterImageFilter(new Scale());
RegisterImageFilter(new Resize());
RegisterImageFilter(new Quality());
RegisterImageFilter(new Blur());
RegisterImageFilter(new Gridscale());
RegisterImageFilter(new Roundlize());