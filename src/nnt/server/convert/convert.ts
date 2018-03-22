import {enumerate, enumm, input, model, output, string} from "../../core/proto";
import {SetT} from "../../core/kernel";
import {SvgConvertor} from "./svgcvt";
import {FileInfo} from "../fileinfo";
import {StringCrypto} from "../../core/string";
import {Config} from "../../manager/config";
import {static_var} from "../../core/core";

@model([enumm])
export class ConvertSupport {
    static SVG = 1;
    static PNG = 2;
}

function ConvertIsSupport(v: number): boolean {
    return v > 0 && v < 3;
}

function ConvertSupportExt(v: number): string {
    switch (v) {
        case ConvertSupport.SVG:
            return "svg";
        case ConvertSupport.PNG:
            return "png";
    }
    return "unknown";
}

@model()
export class ConvertFile {

    @enumerate(1, ConvertSupport, [input], "输入类型", v => ConvertIsSupport(v))
    from: number;

    @enumerate(2, ConvertSupport, [input], "输入类型", v => ConvertIsSupport(v))
    to: number;

    @string(3, [input], "源数据")
    raw: string;

    @string(4, [input], "去重标记")
    idr: string;

    @string(10, [output], "文件在服务器上的路径")
    path: string;

    // 输出的文件名
    output(): string {
        let nm = this.idr + "_" + ConvertSupportExt(this.from);
        let crt = static_var(() => {
            return new StringCrypto(Config.DES_KEY);
        })
        return crt.encode(nm) + "." + ConvertSupportExt(this.to);
    }
}

export interface IConvertor {

    // 转换图片
    convert(src: ConvertFile, fi: FileInfo, cb: ((err: Error, path: string) => void)): void;

    // 是否支持该格式的转换
    support(src: ConvertFile): boolean;
}

let converters = new Set<IConvertor>();

export function RegisterConvertor(cvt: IConvertor) {
    converters.add(cvt);
}

export function FindSupportConvertor(src: ConvertFile): IConvertor {
    return SetT.QueryObject(converters, e => {
        return e.support(src);
    });
}

RegisterConvertor(new SvgConvertor());