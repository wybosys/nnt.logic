import {FieldOption} from "../../core/proto";

/**
 * Paser负责将不同协议传输的数据回写刀模型中，根据不同的协议，params有时为json，有时是字节流
 */

export abstract class AbstractParser {

    // 检查模型和输入数据的匹配情况，返回status的错误码
    abstract checkInput(proto: any, params: any): number;

    // 根据属性定义解码数据
    abstract decodeField(fp: FieldOption, val: any, input: boolean, output: boolean): any;

    // 将数据从参数集写入模型
    abstract fill(mdl: any, params: any, input: boolean, output: boolean): void;
}