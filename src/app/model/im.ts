import {array, auth, boolean, input, integer, model, output, string} from "../../nnt/core/proto";

@model()
export class ImLogin {

    @string(1, [input], "用户")
    user: string;
}

@model([auth])
export class ImLogout {

}

@model([auth])
export class ImMessage {

    @string(1, [input, output], "发送或接受的用户")
    user: string;

    @string(2, [input, output], "发送内容")
    content: string;

    @boolean(3, [input, output], "是否加密")
    crypto: boolean;
}

@model([auth])
export class ImMessageUnreadCount {

    @integer(1, [output])
    count: number;
}

@model([auth])
export class ImMessages {

    @array(1, ImMessage, [output])
    messages: ImMessage[];
}