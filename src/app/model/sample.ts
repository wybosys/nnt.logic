import {auth, input, integer, json, model, output, string} from "../../nnt/core/proto";
import {IndexedObject} from "../../nnt/core/kernel";
import {colstring, table} from "../../nnt/store/proto";

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

@model()
@table("memdb", "user")
export class Login {

    @string(1, [input], "随便输入一个用户id")
    @colstring()
    uid: string;

    @string(2, [output])
    @colstring()
    sid: string;
}

@model([auth])
export class User {

    @string(1, [output], "当前用户id")
    uid: string;
}

@model([auth])
export class Message {

    @string(1, [output], "消息体")
    content: string;
}
