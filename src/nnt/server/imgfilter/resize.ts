import {Filter, image_t, ImageFilter} from "./filter";
import {toInt} from "../../core/kernel";

// resize(w, h, mode)
// mode:
// default or 0: max
// 1: min
export class Resize extends ImageFilter {
    action = "resize";

    init(f: Filter, params: any[]): boolean {
        let p = {
            w: parseInt(params[0]),
            h: parseInt(params[1]),
            m: toInt(params[2])
        };
        if (isNaN(p.w) || isNaN(p.h) || p.w <= 0 || p.h <= 0)
            return false;
        f.params.push(p);
        let h = ["resize", p.w, p.h];
        if (p.m == 1)
            h.push(p.m);
        f.hashs.push(h.join("_"));
        return true;
    }

    proc(p: any, input: image_t, cb: (output: image_t) => void) {
        input.resize(p.w, p.h);
        if (p.m == 1)
            input.min();
        else
            input.max();
        cb(input);
    }
}