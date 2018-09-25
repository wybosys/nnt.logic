import {AbstractParser} from "./parser";
import {FieldOption} from "../../core/proto";

export class Bin extends AbstractParser {

    checkInput(proto: any, params: any): number {
        return 0;
    }

    // 根据属性定义解码数据
    decodeField(fp: FieldOption, val: any, input: boolean, output: boolean): any {
        return null;
    }

    // 将数据从参数集写入模型
    fill(mdl: any, params: any, input: boolean, output: boolean): void {

    }
}