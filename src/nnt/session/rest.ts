import {ErrorCallBack, Session, SuccessCallback} from "./session";
import {Base, HttpContentType, HttpMethod, IResponseData} from "./model";
import {AxiosResponse, default as axios} from "axios";
import {logger} from "../core/logger";
import {toJson, toJsonObject} from "../core/kernel";
import qs = require("qs");
import xml = require("xmlbuilder");
import xml2js = require("xml2js");
import {AbstractParser, FindParser} from "../server/parser/parser";
import {FindRender} from "../server/render/render";

export class RestSession extends Session {

    constructor() {
        super();
    }

    // 全局统一调用对象
    static shared = new RestSession();

    // 获取一个模型
    fetch<T extends Base>(m: T, suc: SuccessCallback<T>, err: ErrorCallBack) {
        let url = "";
        if (m.host)
            url += m.host;
        url += m.requestUrl();
        if (url.indexOf("?") == -1)
            url += "?/";

        // 所有请求参数
        let params = m.requestParams();

        // 构造参数分析及输出
        let parser = FindParser(params.fields['_pfmt']);
        //let render = FindRender(params.fields['_ofmt']);

        // 根据post和get分别处理
        if (m.method == HttpMethod.GET) {
            let p = [];
            for (let k in params.fields) {
                let f = params.fields[k];
                if (typeof f == 'object')
                    f = toJson(f);
                p.push(k + "=" + encodeURIComponent(f));
            }
            if (p.length)
                url += "&" + p.join("&");
            axios.get(url).then(resp => {
                logger.log("S2S: " + url);
                ProcessResponse(resp, parser, m, suc, err);
            }).catch(e => {
                err && err(e);
            });
        }
        else {
            let contentType: string;
            let form: string;
            if (m.requestType == HttpContentType.XML) {
                contentType = "application/xml";
                let f = xml.create(params.root);
                for (let k in params.fields) {
                    f.ele(k, null, params.fields[k]);
                }
                form = f.end();
            }
            else if (m.requestType == HttpContentType.JSON) {
                contentType = "application/json";
                form = toJson(params.fields);
            }
            else {
                contentType = "application/x-www-form-urlencoded";
                form = qs.stringify(params.fields);
            }
            axios.post(url, form, {
                headers: {
                    "Content-Type": contentType
                }
            }).then(resp => {
                logger.log("S2S: " + url + " " + form);
                ProcessResponse(resp, parser, m, suc, err);
            }).catch(e => {
                err && err(e);
            });
        }
    }
}

let SUCCESS = [200];

function ProcessResponse<T extends Base>(resp: AxiosResponse, parser: AbstractParser, m: T, suc: SuccessCallback<T>, err: ErrorCallBack) {
    if (SUCCESS.indexOf(resp.status) == -1) {
        err && err(new Error("请求失败 " + resp.status));
        return;
    }

    let rd: IResponseData = {
        code: resp.status,
        type: resp.headers["content-type"],
        data: resp.data
    };

    if (m.responseType == HttpContentType.JSON) {
        rd.data = toJsonObject(rd.data);
        if (!resp.data) {
            err && err(new Error("收到的数据不符合定义"));
            return;
        }
        m.parseData(rd, parser, () => {
            suc && suc(m);
        }, e => {
            err && err(e);
        });
    }
    else if (m.responseType == HttpContentType.XML) {
        xml2js.parseString(resp.data, (e, result) => {
            if (e) {
                err && err(e);
                return;
            }
            rd.data = result;
            m.parseData(rd, parser, () => {
                suc && suc(m);
            }, e => {
                err && err(e);
            });
        });
    }
    else {
        m.parseData(rd, parser, () => {
            suc && suc(m);
        }, e => {
            err && err(e);
        });
    }
}