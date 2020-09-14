import {IndexedObject} from "../core/kernel";
import {
    array,
    boolean,
    boolean_t,
    double,
    double_t,
    Encode,
    enumerate,
    FieldOption,
    file,
    FP_KEY,
    input,
    integer,
    integer_t,
    json,
    map,
    multimap,
    optional,
    output,
    string,
    string_t,
    type,
    UpdateData
} from "../core/proto";
import {AbstractParser} from "../server/parser/parser";
import {STATUS} from "../core/models";
import {SObject} from "../core/sobject";
import {kSignalEnd, kSignalFailed, kSignalStart, kSignalSucceed} from "../core/signals";

export enum HttpMethod {
    GET = 0,
    POST = 1,
    PUT = 2,
    DELETE = 3
}

export enum HttpContentType {
    MANUAL = 0, // 手动处理
    URLENCODED = 1,
    JSON = 2,
    XML = 3
}

export class RequestParams {

    // 参数列表
    fields: IndexedObject = {};

    // 如果是xml这种树形参数，根节点名称
    root = "root";
}

// 响应数据
export class ResponseData {

    // 响应的code
    code: number;

    // 内容类型
    type: string;

    // 返回的所有数据
    body: any = null;

    // 原始数据
    raw: string;
}

export class ModelError extends Error {
    constructor(code?: number, msg?: string) {
        super(msg);
        this.code = code;
    }

    code: number;
}

// 协议级授权
export class Authorization {

    // 协议层授权
    user: string;
    passwd: string;

}

// 服务端基础模型
export abstract class Base extends SObject {

    protected _initSignals() {
        super._initSignals();
        this._signals.register(kSignalStart);
        this._signals.register(kSignalEnd);
        this._signals.register(kSignalSucceed);
        this._signals.register(kSignalFailed);
    }

    // 唯一id
    static HashCode = 0;
    hashCode: number = ++Base.HashCode;

    // 请求的服务器地址
    host: string;

    // 返回码
    code: number;

    // 错误消息
    error: string;

    // 请求动作
    action: string;

    // 请求方式
    method: HttpMethod = HttpMethod.GET;

    // 默认请求格式
    requestType: HttpContentType = HttpContentType.URLENCODED;

    // 返回数据的格式
    responseType: HttpContentType = HttpContentType.JSON;

    // 使用logic架构规范
    logic: boolean = true;

    // 静默
    quiet: boolean;

    // 协议级授权
    authorization?: Authorization;

    // 组装请求的url
    abstract requestUrl(): string;

    // 组装请求的参数集
    requestParams(): RequestParams {
        let t = Encode(this);
        let r = new RequestParams();

        // 先设置额外的参数，使得徒手设置的参数优先级最高
        if (this.additionParams) {
            for (let k in this.additionParams)
                r.fields[k] = this.additionParams[k];
        }

        // 设置徒手参数
        for (let key in t) {
            let val = t[key];
            if (val == null)
                continue;
            r.fields[key] = val;
        }
        return r;
    }

    // 额外附加的参数
    additionParams: IndexedObject = null;

    // 处理响应的结果
    parseData(data: ResponseData, parser: AbstractParser, suc?: () => void, error?: (err: ModelError) => void) {
        if (this._signals)
            this._signals.emit(kSignalStart);

        // 保护一下数据结构，标准的为 {code, message(error), data}
        if (data.body && data.body.data === undefined && data.body.message !== undefined) {
            data.body.data = data.body.message;
            data.body.message = null;
        }

        this.code = STATUS.UNKNOWN;

        // 读取数据到对象，需要吧code、error放到前面处理，避免如果错误、或者返回的data中本来就包含code时，导致消息的code被通信的code覆盖
        if (data.body) {
            if (this.submodel) {
                // 把data的数据写入model中
                Decode(parser, this, data.body);
            } else {
                this.code = data.body.code;
                Decode(parser, this, data.body.data);
            }
            // 更新
            UpdateData(this);
        }

        if (this.code != 0) {
            let msg = "";
            if (this.error)
                msg += this.error + " ";
            msg += "错误码:" + this.code + " " + data.raw;
            let err = new ModelError(this.code, msg);
            if (error)
                error(err);

            if (this._signals)
                this._signals.emit(kSignalFailed, err);
        } else {
            try {
                if (suc)
                    suc();
            } catch (err) {
                if (error)
                    error(new ModelError(STATUS.EXCEPTION, err.message));
            }

            if (this._signals && !this.quiet)
                this._signals.emit(kSignalSucceed, this);
        }

        if (this._signals)
            this._signals.emit(kSignalEnd, this);
    }

    // 此次访问服务端返回的数据
    data: any;

    // data保存的时二级模型
    submodel: boolean;

    // 由哪个session发起的请求
    session?: Object;

    // 把annotation链接到model，避免需要在api中导入大量函数
    static integer = integer;
    static double = double;
    static output = output;
    static json = json;
    static boolean = boolean;
    static enumerate = enumerate;
    static string = string;
    static input = input;
    static optional = optional;
    static array = array;
    static string_t = string_t;
    static boolean_t = boolean_t;
    static integer_t = integer_t;
    static double_t = double_t;
    static map = map;
    static file = file;
    static multimap = multimap;
    static type = type;

    static NewRequest<T extends Base>(req: any): T {
        let clz: any = req[1];
        let r = new clz();
        r.action = req[0];
        return r;
    }
}

// 和proto中的方向正好相反，是把数据填入output的字段
export function Decode(parser: AbstractParser, mdl: any, params: any) {
    let fps = mdl[FP_KEY];
    if (fps == null)
        return;
    for (let key in params) {
        let fp: FieldOption = fps[key];
        if (fp == null || !fp.output)
            continue;
        mdl[key] = parser.decodeField(fp, params[key], false, true);
    }
}

// 构造一个简单model
export class SimpleModel extends Base {

    requestUrl(): string {
        return "";
    }

}