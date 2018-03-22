import {Filter, image_t, ImageFilter} from "./filter";
import {logger} from "../../core/logger";

// scale(0.1, 0.1)
export class Scale extends ImageFilter {
    action = "scale";

    init(f: Filter, params: any[]): boolean {
        let p = {
            w: (parseFloat(params[0]) * 100) >> 0,
            h: (parseFloat(params[1]) * 100) >> 0
        };
        if (isNaN(p.w) || isNaN(p.h))
            return false;
        f.params.push(p);
        f.hashs.push("scale_" + p.w + "_" + p.h);
        return true;
    }

    proc(p: any, input: image_t, cb: (output: image_t) => void) {
        input.metadata((err, m) => {
            if (err) {
                logger.warn("scale没有获得原始图片的尺寸");
                cb(null);
                return;
            }

            input.resize(m.width * p.w / 100, m.height * p.h / 100);
            cb(input);
        });
    }
}