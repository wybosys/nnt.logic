import {Filter, image_t, ImageFilter} from "./filter";
import {ArrayT, toNumber} from "../../core/kernel";
import {FileInfo} from "../fileinfo";
import fs = require("fs");
import sharp = require("sharpkit");
import {logger} from "../../core/logger";
import log = logger.log;

// gridscale(nw, nh, l, r, t, b)
export class Gridscale extends ImageFilter {
    action = "gridscale";

    init(f: Filter, params: any[]): boolean {
        if (params.length != 6) {
            logger.warn("gridscale输入参数不匹配");
            return false;
        }
        params = ArrayT.Convert(params, toNumber);
        f.hashs.push("gs_" + params.join("_"));
        let p = {
            w: params[0],
            h: params[1],
            l: params[2],
            r: params[3],
            t: params[4],
            b: params[5]
        };
        f.params.push(p);
        return true;
    }

    proc(p: any, input: image_t, cb: (output: image_t) => void, info: FileInfo) {
        // 先检查一下参数有没有越界
        input.metadata((err, md) => {
            if (err) {
                logger.error(err);
                cb(null);
                return;
            }
            if (p.l + p.r >= md.width ||
                p.t + p.b >= md.height ||
                p.l + p.r >= p.w ||
                p.t + p.b >= p.h) {
                logger.warn("gridscale输入的尺寸参数错误");
                cb(null);
                return;
            }
            // 切成9张图片保存在工作目录下
            let subdir = info.workdir + "/gs_" + [p.l, p.r, p.t, p.b].join("_");
            if (!fs.existsSync(subdir)) {
                fs.mkdirSync(subdir);
                let w = [p.l, md.width - p.l - p.r, p.r];
                let h = [p.t, md.height - p.t - p.b, p.b];
                // 9张图片的配置参数
                let setts = [
                    // 1 w h x y
                    [w[0], h[0], 0, 0],
                    [w[1], h[0], w[0], 0],
                    [w[2], h[0], w[0] + w[1], 0],
                    // 2
                    [w[0], h[1], 0, h[0]],
                    [w[1], h[1], w[0], h[0]],
                    [w[2], h[1], w[0] + w[1], h[0]],
                    // 3
                    [w[0], h[2], 0, h[0] + h[1]],
                    [w[1], h[2], w[0], h[0] + h[1]],
                    [w[2], h[2], w[0] + w[1], h[0] + h[1]],
                ];
                // 生成子图片
                ArrayT.SeqForeach(setts, (set, idx, next) => {
                    // gm不支持clone，gd不支持windows，所以使用sharp
                    input.clone().extract({
                        width: set[0],
                        height: set[1],
                        left: set[2],
                        top: set[3]
                    }).toFile(subdir + "/" + idx + ".png", next);
                }, () => {
                    this.doProc(p, input, cb, subdir);
                });
            }
            else {
                this.doProc(p, input, cb, subdir);
            }
        });
    }

    protected doProc(p: any, input: image_t, cb: (output: image_t) => void, subdir: string) {
        // 合并图片
        let output = sharp(<any>{
            create: {
                width: p.w,
                height: p.h,
                channels: 4,
                background: {r: 0, g: 0, b: 0, alpha: 0}
            }
        });
        let w = [p.l, p.w - p.l - p.r, p.r];
        let h = [p.t, p.h - p.t - p.b, p.b];
        // 放四个角不拉伸的
        let noscale = [
            // id x y
            [0, 0, 0],
            [2, w[0] + w[1], 0],
            [6, 0, h[0] + h[1]],
            [8, w[0] + w[1], h[0] + h[1]]
        ];
        // 放中间5个需要拉伸的
        let scale = [
            // id x y w h
            [1, w[0], 0, w[1], h[0]],
            [3, 0, h[0], w[0], h[1]],
            [4, w[0], h[0], w[1], h[1]],
            [5, w[0] + w[1], h[0], w[2], h[1]],
            [7, w[0], h[0] + h[1], w[1], h[2]]
        ];
        // 使用多个buffer来重建, sharp不支持连续overlay
        ArrayT.SeqForeach(noscale, (e, idx, cb) => {
            output.overlayWith(subdir + "/" + e[0] + ".png", {
                left: e[1],
                top: e[2]
            }).png().toBuffer((err, buf) => {
                if (err)
                    logger.error(err);
                output = sharp(buf);
                cb(output);
            });
        }, () => {
            // 放置中间拉伸的
            ArrayT.SeqForeach(scale, (e, idx, cb) => {
                let ts = sharp(subdir + "/" + e[0] + ".png");
                ts.resize(e[3], e[4]).ignoreAspectRatio();
                ts.png().toBuffer((err, buf) => {
                    output.overlayWith(buf, {
                        left: e[1],
                        top: e[2]
                    }).png().toBuffer((err, buf) => {
                        if (err)
                            logger.error(err);
                        output = sharp(buf);
                        cb(output);
                    });
                });
            }, () => {
                cb(output);
            });
        });
    }
}