import {Rest} from "../../server/rest";
import {action, IRouter} from "../../core/router";
import {Node} from "../../config/config";
import {static_cast} from "../../core/core";
import {logger} from "../../core/logger";
import {array, boolean, input, integer, json, model, optional, output, string, string_t, type} from "../../core/proto";
import {IndexedObject} from "../../core/kernel";
import {Transaction} from "../../server/transaction";
import {STATUS} from "../../core/models";

// 极光推送
import jpush = require("jpush-sdk");

@model()
class AndroidMessage {

    @string(1, [input])
    message: string;

    @string(2, [input, optional])
    title: string = null;

    @integer(3, [input, optional])
    sound = 1;

    @json(4, [input, optional])
    args: IndexedObject = null;
}

@model()
class IosMessage {

    @string(1, [input])
    message: string;

    @integer(2, [input, optional])
    sound = 1;
}

@model()
class JPushMessage {

    @boolean(1, [input, optional])
    android: boolean;

    @boolean(2, [input, optional])
    ios: boolean;

    @array(3, string_t, [input, optional], "对象的tag")
    tags: string[];

    @array(4, string_t, [input, optional], "对象的alias")
    aliass: string[];

    @array(5, string_t, [input, optional], "注册号列表")
    regids: string[];

    @string(6, [input, optional], "文字内容")
    message: string;

    @type(7, AndroidMessage, [input, optional], "android特殊的内容")
    androidmessage: AndroidMessage;

    @type(8, IosMessage, [input, optional], "ios特殊的内容")
    iosmessage: IosMessage;

    @string(9, [output], "发送出去的id")
    pushid: string;
}

class RJPush implements IRouter {
    action = "jpush";

    jpush: jpush.Client;

    @action(JPushMessage)
    async push(trans: Transaction) {
        let m: JPushMessage = trans.model;
        let p = this.jpush.push();

        if (m.android && m.ios)
            p.setPlatform(jpush.ALL);
        else if (m.android)
            p.setPlatform("android");
        else if (m.ios)
            p.setPlatform("ios");
        else
            p.setPlatform(jpush.ALL);

        if (!m.tags && !m.aliass && !m.regids)
            p.setAudience(jpush.ALL);
        else {
            let args = [];
            if (m.tags)
                args.push(jpush.tag.apply(null, m.tags));
            if (m.aliass)
                args.push(jpush.alias.apply(null, m.aliass));
            if (m.regids)
                args.push(jpush.registration_id.apply(null, m.regids));
            p.setAudience.apply(p, args);
        }

        {
            let args = [];
            if (m.message)
                args.push(m.message);
            if (m.androidmessage) {
                let msg = m.androidmessage;
                args.push(jpush.android(msg.message,
                    msg.title,
                    msg.sound,
                    msg.args));
            }
            if (m.iosmessage) {
                let msg = m.iosmessage;
                args.push(jpush.ios(msg.message, "sound", msg.sound));
            }
            p.setNotification.apply(p, args);
        }

        p.send((err, res) => {
            if (err) {
                logger.error(err);
                trans.status = STATUS.FAILED;
            } else {
                m.pushid = res.msg_id;
            }
            trans.submit();
        });
    }
}

interface JPushCfg {
    key: string;
    secret: string;
}

export class JPush extends Rest {

    constructor() {
        super();
        this.routers.register(this._svc);
    }

    key: string;
    secret: string;

    private _svc = new RJPush();
    private _jpush: jpush.Client;

    config(cfg: Node): boolean {
        if (!super.config(cfg))
            return false;
        let c = static_cast<JPushCfg>(cfg);
        if (!c.key || !c.secret)
            return false;
        this.key = c.key;
        this.secret = c.secret;
        return true;
    }

    async start(): Promise<void> {
        await super.start();
        this._jpush = jpush.buildClient(this.key, this.secret);
        this._svc.jpush = this._jpush;
        logger.info("连接 {{=it.id}}@jpush", {id: this.id});
    }
}