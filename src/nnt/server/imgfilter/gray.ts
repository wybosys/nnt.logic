import {Filter, image_t, ImageFilter} from "./filter";

// gray()
export class Gray extends ImageFilter {
    action = "gray";

    init(f: Filter, params: any[]): boolean {
        f.hashs.push("gray");
        f.params.push(null);
        return true;
    }

    proc(p: any, input: image_t, cb: (output: image_t) => void) {
        input.grayscale(true);
        cb(input);
    }
}