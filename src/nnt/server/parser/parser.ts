import {FieldOption} from "../../core/proto";
import {logger} from "../../core/logger";
import {Json} from "./json";
import {Bin} from "./bin";

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

let parsers = new Map<string, AbstractParser>();

export function RegisterParser(name: string, parser: AbstractParser) {
    if (parsers.get(name)) {
        logger.fatal("重复注册解析器{{=it.name}}", {name: name});
        return;
    }
    parsers.set(name, parser);
}

export function FindParser(name: string): AbstractParser {
    let r = parsers.get(name);
    return r ? r : parsers.get("json");
}

RegisterParser("json", new Json());
RegisterParser("bin", new Bin());
