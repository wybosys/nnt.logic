import {ConvertFile, ConvertSupport, IConvertor} from "./convert";
import {FileInfo} from "../fileinfo";
import svg2png = require("svg2png");
import fs = require("fs");

export class SvgConvertor implements IConvertor {

    convert(src: ConvertFile, fi: FileInfo, cb: ((err: Error, path: string) => void)): void {
        svg2png(new Buffer(src.raw)).then(buf => {
            // 保存到目标
            fs.writeFile(fi.output, buf, () => {
                cb(null, src.path);
            });
        }).catch(err => {
            cb(err, null);
        });
    }

    // 是否支持该格式的转换
    support(src: ConvertFile): boolean {
        if (src.from != ConvertSupport.SVG)
            return false;
        if (src.to != ConvertSupport.PNG)
            return false;
        if (!src.raw)
            return false;
        return true;
    }
}