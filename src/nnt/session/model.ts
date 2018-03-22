import {IndexedObject} from "../core/kernel";
import {DecodeValue, Encode, FieldOption, FP_KEY, UpdateData} from "../core/proto";
import {logger} from "../core/logger";

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
    fields:IndexedObject = {};

    // 如果是xml这种树形参数，根节点名称
    root = "root";
}

export interface IResponseData {
    code: number,
    message?: string,
    type: string,
    data: any
}

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
    parseData(data: IResponseData, suc: () => void, error: (err: Error) => void) {
        if (data.data) {
            this.data = data.data;
            // 把data的数据写入model中
            Decode(this, this.data);
            // 更新
            UpdateData(this);
        }

        this.code = data.code == null ? -1 : data.code;
        this.error = data.message;
        if (this.code < 0) {
            let msg = "";
            if (this.error)
                msg += this.error + " ";
            msg += "错误码:" + this.code;
            error(new Error(msg));
        }
        else {
            try {
                suc();
            }
            catch (err) {
                error(err);
                logger.error(err);
            }
        }
    }

    // 此次访问服务端返回的数据
    data: any;
}

// 和proto中的方向正好相反，是把数据填入output的字段
export function Decode(mdl: any, params: any) {
    let fps = mdl[FP_KEY];
    if (fps == null)
        return;
    for (let key in params) {
        let fp: FieldOption = fps[key];
        if (fp == null || !fp.output)
            continue;
        mdl[key] = DecodeValue(fp, params[key]);
    }
}
