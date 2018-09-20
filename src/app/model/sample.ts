import {input, integer, json, model, output, string} from "../../nnt/core/proto";
import {IndexedObject} from "../../nnt/core/kernel";

@model()
export class Echoo {

    @string(1, [input], "输入")
    input: string;

    @string(2, [output], "输出")
    output: string;

    @integer(3, [output], "服务器时间")
    time: number;

    @json(4, [output], "当天的时间段")
    today: IndexedObject;
}
