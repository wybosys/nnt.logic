import {Filter, image_t, ImageFilter} from "./filter";

// blur(0.3...1000)
export class Blur extends ImageFilter {
    action = "blur";

    init(f: Filter, params: any[]): boolean {
        let p = {
            sigma: (parseFloat(params[0]) * 10) >> 0,
        };
        if (isNaN(p.sigma))
            return false;
        f.params.push(p);
        f.hashs.push("blur_" + p.sigma);
        return true;
    }

    proc(p: any, input: image_t, cb: (output: image_t) => void) {
        input.blur(p.sigma / 10);
        cb(input);
    }
}