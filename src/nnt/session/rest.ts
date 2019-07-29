import {ErrorCallBack, Session, SuccessCallback} from "./session";
import {Base, HttpContentType, HttpMethod, ModelError, ResponseData} from "./model";
import {logger} from "../core/logger";
import {IndexedObject, ObjectT, toJson, toJsonObject, UploadedFileHandle} from "../core/kernel";
import {AbstractParser, FindParser} from "../server/parser/parser";
import {STATUS} from "../core/models";
import {KEY_PERMISSIONID, KEY_SKIPPERMISSION, Permissions} from "../server/devops/permissions";
import {Config} from "../manager/config";
import xml = require("xmlbuilder");
import xml2js = require("xml2js");
import fs = require("fs");
import request = require("request");

export class Rest extends Session {

    // 全局统一调用对象
    static shared = new Rest();

    // 获取一个模型
    fetch<T extends Base>(m: T, cbsuc: SuccessCallback<T>, cberr: ErrorCallBack) {
        let url = m.requestUrl();

        // 所有请求参数
        let params = m.requestParams();

        // 构造参数分析及输出
        let parser = FindParser(params.fields['_pfmt']);

        // 从params里提取出文件
        let files = ObjectT.PopTuplesByFilter(params.fields, v => {
            return v instanceof UploadedFileHandle;
        });
        if (files.length)
            m.method = HttpMethod.POST; // 含有文件的必须走post

        // 根据post和get分别处理
        if (m.method != HttpMethod.POST) {
            if (m.logic) {
                // 保护url的结尾符
                if (url.indexOf("?") == -1)
                    url += "/?";

                // 添加devops的参数
                if (Permissions) {
                    url += '&' + KEY_PERMISSIONID + '=' + Permissions.id;
                } else if (Config.LOCAL) {
                    url += '&' + KEY_SKIPPERMISSION + "=1";
                }
            }

            // 附加模型参数
            let p = [];
            for (let k in params.fields) {
                let f = params.fields[k];
                if (typeof f == 'object')
                    f = toJson(f);
                p.push(k + "=" + encodeURIComponent(f));
            }
            if (p.length) {
                // 保护url的结尾符
                if (url.indexOf("?") == -1)
                    url += "/?";

                url += "&" + p.join("&");
            }

            // 发起请求
            logger.log("S2S:" + url);
            let data: request.CoreOptions & request.UrlOptions = {
                url: url
            };
            let cb: request.RequestCallback = (err, resp, body) => {
                if (err) {
                    cberr && cberr(err);
                } else {
                    ProcessResponse(resp, parser, m, cbsuc, cberr);
                }
            };
            let req: request.Request;
            switch (m.method) {
                case HttpMethod.GET:
                    req = request.get(data, cb);
                    break;
                case HttpMethod.PUT:
                    req = request.put(data, cb);
                    break;
                case HttpMethod.DELETE:
                    req = request.delete(data, cb);
                    break;
            }
            if (m.user)
                req.auth(m.user, m.passwd);
        } else {
            if (m.logic) {
                // 保护url的结尾符
                if (url.indexOf("?") == -1)
                    url += "/?";

                // 添加devops的参数
                if (Permissions) {
                    url += '&' + KEY_PERMISSIONID + '=' + Permissions.id;
                } else if (Config.LOCAL) {
                    url += '&' + KEY_SKIPPERMISSION + "=1";
                }
            }

            // POST
            let data: request.CoreOptions & request.UrlOptions = {
                url: url,
                headers: {}
            };
            if (m.requestType == HttpContentType.XML) {
                data.headers['Content-Type'] = "application/xml";
                let f = xml.create(params.root);
                for (let k in params.fields) {
                    f.ele(k, null, params.fields[k]);
                }
                data.body = f.end();
                if (files.length)
                    logger.warn("暂时不支持xml的请求附带文件");
            } else if (m.requestType == HttpContentType.JSON) {
                data.headers['Content-Type'] = "application/json";
                if (files.length) {
                    let form: IndexedObject = {};
                    ObjectT.Foreach(params.fields, (v, k) => {
                        // 测试时发现form不能传入bool，所以需要转换
                        if (typeof v == "boolean")
                            v = v ? 1 : 0;
                        form[k] = v;
                    });
                    files.forEach(e => {
                        let ufh: UploadedFileHandle = e[1];
                        form[e[0]] = {
                            value: fs.createReadStream(ufh.path),
                            options: {
                                filename: ufh.name,
                                contentType: ufh.type
                            }
                        }
                    });
                    data.formData = form;
                } else {
                    data.body = toJson(params.fields);
                }
            } else {
                if (files.length) {
                    data.headers['Content-Type'] = "multipart/form-data";
                    let form: IndexedObject = {};
                    ObjectT.Foreach(params.fields, (v, k) => {
                        // 测试时发现form不能传入bool，所以需要转换
                        if (typeof v == "boolean")
                            v = v ? 1 : 0;
                        form[k] = v;
                    });
                    files.forEach(e => {
                        let ufh: UploadedFileHandle = e[1];
                        form[e[0]] = {
                            value: fs.createReadStream(ufh.path),
                            options: {
                                filename: ufh.name,
                                contentType: ufh.type
                            }
                        }
                    });
                    data.formData = form;
                } else {
                    data.headers['Content-Type'] = "application/x-www-form-urlencoded";
                    data.form = params.fields;
                }
            }
            let req = request.post(data, (err, resp, body) => {
                if (err) {
                    cberr && cberr(err);
                } else {
                    logger.log("S2S: " + url);
                    ProcessResponse(resp, parser, m, cbsuc, cberr);
                }
            });
            if (m.user)
                req.auth(m.user, m.passwd);
        }
    }
}

let SUCCESS = [200, 204];

function ProcessResponse<T extends Base>(resp: request.Response, parser: AbstractParser, m: T, suc: SuccessCallback<T>, err: ErrorCallBack) {
    if (SUCCESS.indexOf(resp.statusCode) == -1) {
        err && err(new ModelError(STATUS.FAILED, "请求失败 " + resp.statusCode));
        return;
    }

    let rd = new ResponseData();
    rd.code = resp.statusCode;
    rd.type = resp.headers["content-type"];
    rd.raw = resp.body;
    //logger.log(`收到 ${resp.body}`);

    if (m.responseType == HttpContentType.JSON) {
        rd.body = toJsonObject(resp.body);
        if (!rd.body) {
            err && err(new ModelError(STATUS.FAILED, "收到的数据不符合定义"));
            return;
        }
        m.parseData(rd, parser, () => {
            suc && suc(m);
        }, e => {
            err && err(e);
        });
    } else if (m.responseType == HttpContentType.XML) {
        xml2js.parseString(resp.body, (e, result) => {
            if (e) {
                err && err(new ModelError(STATUS.FORMAT_ERROR, e.message));
                return;
            }
            rd.body = result;
            m.parseData(rd, parser, () => {
                suc && suc(m);
            }, e => {
                err && err(e);
            });
        });
    } else {
        m.parseData(rd, parser, () => {
            suc && suc(m);
        }, e => {
            err && err(e);
        });
    }
}
