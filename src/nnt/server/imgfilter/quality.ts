import {Filter, image_t, ImageFilter} from "./filter";

export class Quality extends ImageFilter {
    action = "quality";

    init(f: Filter, params: any[]): boolean {
        let q = (parseFloat(params[0]) * 100) >> 0;
        if (isNaN(q))
            return false;
        f.params.push(q);
        f.hashs.push("quality_" + q);
        return true;
    }

    proc(q: any, input: image_t, cb: (output: image_t) => void) {
        input.jpeg({
            quality: q
        });
        cb(input);
    }
}