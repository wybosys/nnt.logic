import {Filter, image_t, ImageFilter} from "./filter";
import {FileInfo} from "../fileinfo";
import {logger} from "../../core/logger";
import fs = require("fs");
import gm = require("gm");

// 圆角化 roundlize()
export class Roundlize extends ImageFilter {
    action = "roundlize";

    init(f: Filter, params: any[]): boolean {
        f.hashs.push("rdz");
        f.params.push(null);
        return true;
    }

    proc(p: any, input: image_t, cb: (output: image_t) => void, info: FileInfo) {
        // 圆角化需要生成对应的mask
        input.metadata((err, md) => {
            if (err) {
                logger.warn("roundlize没有获得原始图片的尺寸");
                cb(null);
                return;
            }

            let fi = Math.min(md.width, md.height);
            let maskdir = info.storedir + "/" + "mask";
            if (!fs.existsSync(maskdir))
                fs.mkdirSync(maskdir);
            let maskfile = maskdir + "/rdz_" + fi + ".png";
            if (!fs.existsSync(maskfile)) {
                // 生成遮罩
                gm(fi, fi, "#00ffffff")
                    .fill("#fff")
                    .drawCircle(fi >> 1, fi >> 1, fi, fi >> 1)
                    .write(maskfile, err => {
                        this.doMask(input, maskfile, cb);
                    });
            } else {
                this.doMask(input, maskfile, cb);
            }
        });
    }

    protected doMask(input: image_t, maskfile: string, cb: (output: image_t) => void) {
        input.metadata((err, md) => {
            let fi = Math.min(md.width, md.height);
            input.composite([{
                input: maskfile,
                blend: "source"
            }])
                .resize(fi, fi);
            cb(input);
        });
    }
}