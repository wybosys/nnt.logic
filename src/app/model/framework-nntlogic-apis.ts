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
    
        IM_CHECK_FAILED = -899,
    
        IM_NO_RELEATION = -898,
    
        SOCK_WRONG_PORTOCOL = -860,
    
        SOCK_AUTH_TIMEOUT = -859,
    
        SOCK_SERVER_CLOSED = -858,
    
        THIRD_FAILED = -5,
    
        MULTIDEVICE = -4,
    
        HFDENY = -3,
    
        TIMEOUT = -2,
    
        FAILED = -1,
    
        OK = 0,
    
  }





  export class MNull extends ApiModel {
    
  }

  export class MAuthedNull extends ApiModel {
    
  }

  export class MRestUpdate extends ApiModel {
    
        @Model.integer(1, [Model.output], "心跳间隔")
        heartbeatTime:number;
    
        @Model.json(2, [Model.output])
        models:Object;
    
  }

  export class MPaged extends ApiModel {
    
        @Model.integer(1, [Model.input, Model.output, Model.optional], "排序依赖的最大数值")
        last?:number;
    
        @Model.integer(2, [Model.input, Model.optional], "一次拉取多少个")
        limit?:number;
    
        @Model.array(3, Object, [Model.output], "接收到的对象")
        items:Array<Object>;
    
        @Model.array(4, Object, [Model.output], "所有对象")
        all:Array<Object>;
    
  }

  export class MEchoo extends ApiModel {
    
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
    
  }

  export class MLogin extends ApiModel {
    
        @Model.string(1, [Model.input], "随便输入一个用户id")
        uid:string;
    
        @Model.string(2, [Model.output])
        sid:string;
    
  }

  export class MUser extends ApiModel {
    
        @Model.string(1, [Model.output], "当前用户id")
        uid:string;
    
  }

  export class MMessage extends ApiModel {
    
        @Model.string(1, [Model.output], "消息体")
        content:string;
    
  }

  export class MUpload extends ApiModel {
    
        @Model.file(1, [Model.input, Model.output], "选择一个图片")
        file:any;
    
  }


class Routers {

  static SampleEcho = ["sample.echo", MEchoo, ""];

  static SampleCallecho = ["sample.callecho", MEchoo, ""];

  static SampleLogin = ["sample.login", MLogin, ""];

  static SampleUser = ["sample.user", MUser, ""];

  static SampleMessage = ["sample.message", MMessage, "监听消息炸弹"];

  static SampleUpload = ["sample.upload", MUpload, "上传图片"];

  static SampleNull = ["sample.null", MNull, "不需要传参的模型"];

}


  export function SampleEcho():MEchoo {
    return Model.NewRequest(Routers.SampleEcho);
  }

  export function SampleCallecho():MEchoo {
    return Model.NewRequest(Routers.SampleCallecho);
  }

  export function SampleLogin():MLogin {
    return Model.NewRequest(Routers.SampleLogin);
  }

  export function SampleUser():MUser {
    return Model.NewRequest(Routers.SampleUser);
  }

  export function SampleMessage():MMessage {
    return Model.NewRequest(Routers.SampleMessage);
  }

  export function SampleUpload():MUpload {
    return Model.NewRequest(Routers.SampleUpload);
  }

  export function SampleNull():MNull {
    return Model.NewRequest(Routers.SampleNull);
  }

