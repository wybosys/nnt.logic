import {action, IRouter} from "../../core/router";
import {array, input, model, optional, string, string_t} from "../../core/proto";
import {Transaction} from "../../server/transaction";
import {Node} from "../../config/config";
import {Rest} from "../../server/rest";
import {static_cast} from "../../core/core";
import {logger} from "../../core/logger";
import {STATUS} from "../../core/models";
import {Base, HttpContentType, HttpMethod, ResponseData, ModelError} from "../../session/model";
import {Rest as RestSession} from "../../session/rest";
import {REGEX_PHONE} from "../../component/pattern";
import {ArrayT} from "../../core/kernel";
import soap = require("soap");
import crypto = require("crypto");
import xml = require("xmlbuilder");
import xml2js = require("xml2js");
import {AbstractParser} from "../../server/parser/parser";

@model()
export class PlainSms {

    @string(1, [input, optional])
    id: string;

    @array(2, string_t, [input], null, ph => !ArrayT.QueryObject(ph, (e: string) => {
        return e.match(REGEX_PHONE) == null;
    }))
    phone: string[];

    @string(3, [input])
    content: string;
}

interface MessagePayload {
    smsId?: string;
    phoneNumber: string[];
    content: string;
    subCode: string;
    sendTime?: Date;
    templateId?: string;
}

interface SoapMessage {
    account: string,
    password: string,
    smsType: string,
    message: MessagePayload;
}

interface SoapHy {
    sendSms(msg: SoapMessage, cb: (err: Error) => void): void;
}

@model()
class RestSendMessage extends Base {

    constructor() {
        super();
        this.method = HttpMethod.POST;
        this.responseType = HttpContentType.MANUAL; // 手动处理返回数据，避免重新调试短信接口
    }

    requestUrl(): string {
        return "/sms/http/submitSms";
    }

    @string(1, [input])
    account: string;

    @string(2, [input])
    password: string;

    @string(3, [input])
    smsType: string;

    @string(4, [input])
    message: string;

    parseData(resp: ResponseData, parser: AbstractParser, suc: () => void, error: (err: ModelError) => void) {
        if (typeof resp.body == "string") {
            // 解析xml到类型
            xml2js.parseString(resp.body, (err, result) => {
                if (err) {
                    error(new ModelError(STATUS.FORMAT_ERROR, err.message));
                    return;
                }

                result = result.MtMessageRes;

                if (result.subStat[0] != "r:000") {
                    let msg = result.subStatDes[0];
                    error(new ModelError(STATUS.FAILED, msg));
                    return;
                }
                else {
                    resp.code = 0;
                    resp.body = result;
                }

                super.parseData(resp, parser, suc, error);
            });
        }
        else {
            super.parseData(resp, parser, suc, error);
        }
    }

    static PayloadToXml(msg: MessagePayload): string {
        let r = xml.create("MtMessage");
        r.dec("1.0", "UTF-8", true);
        r.ele("content", null, msg.content);
        r.ele("subCode", null, msg.subCode);
        msg.phoneNumber.forEach(e => {
            r.ele("phoneNumber", null, e);
        });
        if (msg.sendTime)
            r.ele("sendTime", null, msg.sendTime.toTimeString());
        if (msg.smsId)
            r.ele("smsId", null, msg.smsId);
        if (msg.templateId)
            r.ele("templateId", null, msg.templateId);
        return r.end();
    }
}

class RSms implements IRouter {
    action = "hangyuan";

    @action(PlainSms)
    sms(trans: Transaction) {
        let m: PlainSms = trans.model;
        let srv = static_cast<Hangyuan>(trans.server);

        if (m.content.length > 500) {
            trans.status = STATUS.OVERFLOW;
            trans.submit();
            return;
        }

        let pl: MessagePayload = {
            smsId: m.id,
            phoneNumber: m.phone,
            content: srv.sign + m.content,
            subCode: srv.code
        };

        if (srv.soap) {
            let sp = srv.methods;
            sp.sendSms({
                account: srv.user,
                password: srv.passwd,
                smsType: srv.type,
                message: pl
            }, (err) => {
                if (err) {
                    logger.error(err);
                    trans.status = STATUS.FAILED;
                }
                trans.submit();
            });
        }
        else {
            let m = new RestSendMessage();
            m.host = srv.url;
            m.account = srv.user;
            m.password = srv.passwd;
            m.smsType = srv.type;
            m.message = RestSendMessage.PayloadToXml(pl);
            RestSession.Fetch(m).then(() => {
                trans.submit();
            }).catch(err => {
                let msg = err.message;
                logger.warn(msg);
                trans.message = msg;
                trans.status = STATUS.FAILED;
                trans.submit();
            });
        }
    }
}

interface HangyuanConfig {
    user: string;
    passwd: string;
    type: string;
    code: string;
    url: string;
    soap: boolean;
    sign: string;
}

export class Hangyuan extends Rest {

    constructor() {
        super();
        this.routers.register(new RSms());
    }

    user: string;
    passwd: string;
    type: string;
    code: string;
    url: string;
    soap: boolean;
    sign: string;

    config(cfg: Node): boolean {
        if (!super.config(cfg))
            return false;
        let c = static_cast<HangyuanConfig>(cfg);
        if (!c.user || !c.passwd || !c.type || !c.code || !c.url || !c.sign) {
            return false;
        }
        this.user = c.user;
        this.passwd = Hangyuan.PasswdEncrypt(c.passwd);
        this.type = c.type;
        this.code = c.code;
        this.soap = c.soap;
        this.sign = c.sign;
        if (this.soap)
            this.url = "http://" + c.url + ":8899/sms/webService/smsOper?wsdl";
        else
            this.url = "http://" + c.url + ":8899";
        return true;
    }

    protected static PasswdEncrypt(pwd: string): string {
        return crypto.createHash('md5').update(pwd).digest('hex').toLowerCase();
    }

    protected _hy: soap.Client;

    get methods(): SoapHy {
        return <any>this._hy;
    }

    async start(): Promise<void> {
        await super.start();
        if (this.soap) {
            soap.createClient(this.url, (err, cli) => {
                if (err) {
                    logger.info("遇到错误 {{=it.id}}@hangyuan", {id: this.id});
                    logger.error(err);
                    return;
                }

                this._hy = cli;
                logger.info("连接 {{=it.id}}@hangyuan", {id: this.id});
            });
        }
        else {
            logger.info("连接 {{=it.id}}@hangyuan", {id: this.id});
        }
    }
}
