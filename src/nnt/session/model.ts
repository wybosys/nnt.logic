import {IndexedObject} from "../core/kernel";
import {Encode, FieldOption, FP_KEY, UpdateData} from "../core/proto";
import {AbstractParser} from "../server/parser/parser";
import {STATUS} from "../core/models";

export enum HttpMethod {
    GET,
    POST,
}

export enum HttpContentType {
    MANUAL, // 手动处理
    URLENCODED,
    JSON,
    XML,
}

export class RequestParams {

    // 参数列表
    fields: IndexedObject = {};

    // 如果是xml这种树形参数，根节点名称
    root = "root";
}

export interface IResponseData {

    // 返回的code
    code: number,

    // 返回消息体
    message?: string,

    // 内容类型
    type: string,

    // 数据
    data: any;
}

export class ModelError extends Error {
    constructor(code?: number, msg?: string) {
        super(msg);
        this.code = code;
    }

    code: number;
}

// 服务端基础模型
export abstract class Base {

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
    parseData(data: IResponseData, parser: AbstractParser, suc: () => void, error: (err: ModelError) => void) {
        this.code = data.code == null ? -1 : data.code;
        this.error = data.message;

        // 读取数据到对象，需要吧code、error放到前面处理，避免如果错误、或者返回的data中本来就包含code时，导致消息的code被通信的code覆盖
        if (data.data) {
            this.data = data.data;
            // 把data的数据写入model中
            Decode(parser, this, this.data);
            // 更新
            UpdateData(this);
        }

        if (this.code != 0) {
            let msg = "";
            if (this.error)
                msg += this.error + " ";
            msg += "错误码:" + this.code;
            let err = new ModelError(this.code, msg);
            error(err);
        }
        else {
            try {
                suc();
            }
            catch (err) {
                error(new ModelError(STATUS.EXCEPTION, err.message));
            }
        }
    }

    // 此次访问服务端返回的数据
    data: any;
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
