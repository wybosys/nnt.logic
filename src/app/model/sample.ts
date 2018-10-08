import {
    array,
    auth,
    double_t, file, FileType,
    input,
    integer,
    integer_t,
    json,
    map,
    model,
    output,
    string,
    string_t
} from "../../nnt/core/proto";
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

    @json(4, [output])
    json: IndexedObject;

    @map(5, string_t, integer_t, [output])
    map = new Map<string, number>();

    @array(6, double_t, [output])
    array = new Array<number>();
}

@model()
@table("localdb", "user")
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

@model([])
export class Upload {

    @file(1, [input, output], "选择一个图片")
    file: FileType;
}
