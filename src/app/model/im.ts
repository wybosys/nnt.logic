import {array, auth, boolean, input, integer, model, optional, output, string} from "../../nnt/core/proto";

@model()
export class ImUserLogin {

    @string(1, [input], "用户")
    user: string;
}

@model([auth])
export class ImUserLogout {

}

@model([auth])
export class ImMessage {

    @string(1, [output], "发送的用户")
    from: string;

    @string(2, [input, output], "接受的用户")
    to: string;

    @string(3, [input, output], "发送内容")
    content: string;

    @boolean(4, [input, output, optional], "是否加密")
    crypto: boolean;
}

@model([auth])
export class ImNewMessage {
    
    @string(1, [output], "发送的用户")
    from: string;

    @string(2, [output], "接受的用户")
    to: string;

    @string(3, [output], "发送内容")
    content: string;

    @boolean(4, [output], "是否加密")
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

@model([auth])
export class ImSignalSignatureCode {

    @string(1, [input], "对象用户")
    target: string;

    @string(2, [output], "签名code")
    signcode: string;
}