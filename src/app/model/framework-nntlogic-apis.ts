// 请不要修改该自动生成的文件

import {Model} from "./model-impl";

class ApiModel extends Model {
  domain = "framework/nntlogic";
}


  export enum STATUS {
    
        UNKNOWN = -1000,
    
        EXCEPTION = -999,
    
        ROUTER_NOT_FOUND = -998,
    
        CONTEXT_LOST = -997,
    
        MODEL_ERROR = -996,
    
        PARAMETER_NOT_MATCH = -995,
    
        NEED_AUTH = -994,
    
        TYPE_MISMATCH = -993,
    
        FILESYSTEM_FAILED = -992,
    
        FILE_NOT_FOUND = -991,
    
        ARCHITECT_DISMATCH = -990,
    
        SERVER_NOT_FOUND = -989,
    
        LENGTH_OVERFLOW = -988,
    
        TARGET_NOT_FOUND = -987,
    
        PERMISSIO_FAILED = -986,
    
        WAIT_IMPLEMENTION = -985,
    
        ACTION_NOT_FOUND = -984,
    
        TARGET_EXISTS = -983,
    
        STATE_FAILED = -982,
    
        UPLOAD_FAILED = -981,
    
        MASK_WORD = -980,
    
        SELF_ACTION = -979,
    
        PASS_FAILED = -978,
    
        OVERFLOW = -977,
    
        AUTH_EXPIRED = -976,
    
        SIGNATURE_ERROR = -975,
    
        FORMAT_ERROR = -974,
    
        CONFIG_ERROR = -973,
    
        PRIVILEGE_ERROR = -972,
    
        LIMIT = -971,
    
        PAGED_OVERFLOW = -970,
    
        NEED_ITEMS = -969,
    
        DECODE_ERROR = -968,
    
        ENCODE_ERROR = -967,
    
        IM_CHECK_FAILED = -899,
    
        IM_NO_RELEATION = -898,
    
        SOCK_WRONG_PORTOCOL = -860,
    
        SOCK_AUTH_TIMEOUT = -859,
    
        SOCK_SERVER_CLOSED = -858,
    
        SECURITY_FAILED = -6,
    
        THIRD_FAILED = -5,
    
        MULTIDEVICE = -4,
    
        HFDENY = -3,
    
        TIMEOUT = -2,
    
        FAILED = -1,
    
        OK = 0,
    
  }

  export enum EchoType {
    
        TEST = 88,
    
  }





  export class Null extends ApiModel {
    
  }

  export class AuthedNull extends ApiModel {
    
  }

  export class AuthedObject extends ApiModel {
    
        @Model.type(1, Object, [Model.output])
        object:Object;
    
  }

  export class RestUpdate extends ApiModel {
    
        @Model.integer(1, [Model.output], "心跳间隔")
        heartbeatTime:number;
    
        @Model.json(2, [Model.output])
        models:Object;
    
  }

  export class SeqPaged extends ApiModel {
    
        @Model.integer(1, [Model.input, Model.output, Model.optional], "排序依赖的最大数值")
        last?:number;
    
        @Model.integer(2, [Model.input, Model.optional], "一次拉取多少个")
        limit?:number;
    
        @Model.integer(3, [Model.output], "数据总数")
        total:number;
    
  }

  export class NumPaged extends ApiModel {
    
        @Model.integer(1, [Model.input, Model.output, Model.optional], "请求的页码")
        page?:number;
    
        @Model.integer(2, [Model.input, Model.optional], "单页多少条数据")
        limit?:number;
    
        @Model.integer(3, [Model.output], "数据总数")
        total:number;
    
  }

  export class Echoo extends ApiModel {
    
        @Model.string(1, [Model.input], "输入")
        input:string;
    
        @Model.string(2, [Model.output], "输出")
        output:string;
    
        @Model.integer(3, [Model.output], "服务器时间")
        time:number;
    
        @Model.json(4, [Model.output])
        json:Object;
    
        @Model.map(5, Model.string_t, Model.integer_t, [Model.output])
        map:Map<string, number>;
    
        @Model.array(6, Model.double_t, [Model.output])
        array:Array<number>;
    
        @Model.enumerate(7, EchoType, [Model.output])
        enm:EchoType;
    
        @Model.type(8, Null, [Model.output])
        nullval:Null;
    
  }

  export class Login extends ApiModel {
    
        @Model.string(1, [Model.input], "随便输入一个用户id")
        uid:string;
    
        @Model.string(2, [Model.output])
        sid:string;
    
        @Model.string(3, [Model.input, Model.optional], "sdk返回的数据")
        raw?:string;
    
        @Model.string(4, [Model.input, Model.optional], "渠道")
        channel?:string;
    
  }

  export class User extends ApiModel {
    
        @Model.string(1, [Model.output], "当前用户id")
        uid:string;
    
  }

  export class LoginSDK extends ApiModel {
    
        @Model.string(1, [Model.input], "sdk返回的数据")
        raw:string;
    
        @Model.string(2, [Model.input], "渠道")
        channel:string;
    
        @Model.type(3, User, [Model.output])
        user:User;
    
        @Model.string(4, [Model.output])
        sid:string;
    
  }

  export class LoginVerifySDK extends ApiModel {
    
        @Model.string(1, [Model.input])
        sid:string;
    
        @Model.type(2, User, [Model.output])
        user:User;
    
  }

  export class Message extends ApiModel {
    
        @Model.string(1, [Model.output], "消息体")
        content:string;
    
  }

  export class Upload extends ApiModel {
    
        @Model.file(1, [Model.input, Model.output], "选择一个图片")
        file:any;
    
  }

  export class ImUserLogin extends ApiModel {
    
        @Model.string(1, [Model.input], "用户")
        user:string;
    
  }

  export class ImUserLogout extends ApiModel {
    
  }

  export class ImMessage extends ApiModel {
    
        @Model.string(1, [Model.input, Model.output], "发送或接受的用户")
        user:string;
    
        @Model.string(2, [Model.input, Model.output], "发送内容")
        content:string;
    
        @Model.boolean(3, [Model.input, Model.output], "是否加密")
        crypto:boolean;
    
  }

  export class ImMessageUnreadCount extends ApiModel {
    
        @Model.integer(1, [Model.output])
        count:number;
    
  }

  export class ImMessages extends ApiModel {
    
        @Model.array(1, ImMessage, [Model.output])
        messages:Array<ImMessage>;
    
  }

  export class ImSignalSignatureCode extends ApiModel {
    
        @Model.string(1, [Model.input], "对象用户")
        target:string;
    
        @Model.string(2, [Model.output], "签名code")
        signcode:string;
    
  }


class Routers {

  static ImLogin = ["im.login", ImUserLogin, ""];

  static ImLogout = ["im.logout", ImUserLogout, ""];

  static ImSend = ["im.send", ImMessage, ""];

  static ImUnreadcount = ["im.unreadcount", ImMessageUnreadCount, ""];

  static ImReceive = ["im.receive", ImMessages, ""];

  static ImSigncode = ["im.signcode", ImSignalSignatureCode, "获得本地链接签名code"];

}


  export function ImLogin():ImUserLogin {
    return Model.NewRequest(Routers.ImLogin);
  }

  export function ImLogout():ImUserLogout {
    return Model.NewRequest(Routers.ImLogout);
  }

  export function ImSend():ImMessage {
    return Model.NewRequest(Routers.ImSend);
  }

  export function ImUnreadcount():ImMessageUnreadCount {
    return Model.NewRequest(Routers.ImUnreadcount);
  }

  export function ImReceive():ImMessages {
    return Model.NewRequest(Routers.ImReceive);
  }

  export function ImSigncode():ImSignalSignatureCode {
    return Model.NewRequest(Routers.ImSigncode);
  }

