import {ErrorCallBack, Session, SuccessCallback} from "./session";
import {Base, HttpContentType, HttpMethod, IResponseData} from "./model";
import {AxiosResponse, default as axios} from "axios";
import {logger} from "../core/logger";
import {toJson, toJsonObject} from "../core/kernel";
import qs = require("qs");
import xml = require("xmlbuilder");
import xml2js = require("xml2js");

export class RestSession extends Session {

    constructor() {
        super();
    }

    static shared = new RestSession();

    fetch<T extends Base>(m: T, suc: SuccessCallback<T>, err: ErrorCallBack) {
        let url = "";
        if (m.host)
            url += m.host;
        url += m.requestUrl();
        if (url.indexOf("?") == -1)
            url += "?/";
        let params = m.requestParams();
        if (m.method == HttpMethod.GET) {
            let p = [];
            for (let k in params.fields) {
                let f = params.fields[k];
                p.push(k + "=" + encodeURIComponent(f));
            }
            if (p.length)
                url += "&" + p.join("&");
            axios.get(url).then(resp => {
                logger.log("S2S: " + url);
                ProcessResponse(resp, m, suc, err);
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
                ProcessResponse(resp, m, suc, err);
            }).catch(e => {
                err && err(e);
            });
        }
    }
}

let SUCCESS = [200];

function ProcessResponse<T extends Base>(resp: AxiosResponse, m: T, suc: SuccessCallback<T>, err: ErrorCallBack) {
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
        m.parseData(rd, () => {
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
            m.parseData(rd, () => {
                suc && suc(m);
            }, e => {
                err && err(e);
            });
        });
    }
    else {
        m.parseData(rd, () => {
            suc && suc(m);
        }, e => {
            err && err(e);
        });
    }
}