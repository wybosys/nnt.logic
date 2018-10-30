import {
    array,
    auth, boolean,
    double_t, enumerate, enumm, file, FileType,
    input,
    integer,
    integer_t,
    json,
    map,
    model, optional,
    output,
    string,
    string_t, type
} from "../../nnt/core/proto";
import {IndexedObject} from "../../nnt/core/kernel";
import {colstring, coltype, table} from "../../nnt/store/proto";
import {Null} from "../../nnt/core/models";

@model([enumm])
export class EchoType {
    static TEST = 88;
}

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

    @enumerate(7, EchoType, [output])
    enm = EchoType.TEST;

    @type(8, Null, [output])
    nullval: Null;
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

    @string(3, [input, optional], "sdk返回的数据")
    @colstring()
    raw: string;

    @string(4, [input, optional], "渠道")
    @colstring()
    channel: string;
}

@model([auth])
export class User {

    @string(1, [output], "当前用户id")
    uid: string;
}

@model()
export class LoginSDK {

    @string(1, [input], "sdk返回的数据")
    raw: string;

    @string(2, [input], "渠道")
    channel: string;

    @type(3, User, [output])
    user: User;

    @string(4, [output])
    sid: string;
}

@model()
export class LoginVerifySDK {

    @string(1, [input])
    sid: string;

    @type(2, User, [output])
    user: User;
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
