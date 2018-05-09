import {Connector as BaseConnector, Socket, Transaction as BaseTransaction} from "./socket";
import {Node} from "../config/config";
import {logger} from "../core/logger";
import {GetObjectClassName} from "../core/core";
import {IndexedObject, Multimap} from "../core/kernel";
import {Acquire, IMQClient} from "./mq";
import {Variant} from "../core/object";

export interface IMPMessage {

    // 用户的标识
    u: string;

    // model的类名
    c: string;

    // model的id
    d?: number;

    // model数据
    p: IndexedObject;

    // 内部消息
    i: boolean;
}

// 多玩家服务需要提供带user区分的事务
export abstract class Transaction extends BaseTransaction {

    // 用户标记
    abstract userIdentifier(): string;
}

export class Connector extends BaseConnector {

    // 用户标记
    userIdentifier: string;

    // 使用的mq服务
    mqsrv: string;

    init(trans: Transaction): boolean {
        if (!trans.auth())
            return false;
        let r = super.init(trans);
        this.userIdentifier = trans.userIdentifier();
        return r;
    }

    protected _mqA: IMQClient;
    protected _mqB: IMQClient;

    avaliable() {
        // 建立mq服务器
        // Z users.online <AD|fanout>
        // Y users <D|fanout>
        // B user.online.<uid> <AD|topic>
        // A user.<uid> <D|topic>

        Acquire(this.mqsrv).open("user." + this.userIdentifier, {
            durable: true,
            longliving: true
        }).then(mq => {
            this._mqA = mq;
            mq.subscribe(data => {
                this.processData(data);
            });
            mq.receiver("users", true);
        });

        Acquire(this.mqsrv).open("user.online." + this.userIdentifier, {
            durable: false,
            longliving: false
        }).then(mq => {
            this._mqB = mq;
            mq.subscribe(data => {
                this.processData(data);
            });
            mq.receiver("users.online", true);
        });
    }

    protected processData(data: Variant) {
        let jsobj: IMPMessage = <any>data.toJsObj();
        if (jsobj.i)
            return;
        // 指定了modelid，如果查找到，则直接发送
        if (jsobj.d) {
            if (this._listenings.contains(jsobj.c, jsobj.d)) {
                this.send(data.toBuffer());
            } else {
                logger.warn("没有找到客户端对modelid的监听");
                return;
            }
        }
        // 制定了class，遍历所有的监听
        let arr = this._listenings.get(jsobj.c);
        if (arr && arr.length) {
            arr.forEach(e => {
                let t = {
                    d: e,
                    p: jsobj.p
                };
                this.send(new Variant(t).toBuffer());
            });
        }
        else {
            logger.warn("客户端没有对model的监听");
        }
    }

    unavaliable() {
        if (this._mqA) {
            this._mqA.unsubscribe();
            this._mqA.close();
            this._mqA = null;
        }

        if (this._mqB) {
            this._mqB.unsubscribe();
            this._mqB.close();
            this._mqB = null;
        }
    }

    listen(model: any, mid: number) {
        let name = GetObjectClassName(model);
        this._listenings.push(name, mid);
    }

    unlisten(model: any, mid: number) {
        let name = GetObjectClassName(model);
        this._listenings.pop(name, mid);
    }

    // 保存所有listen的modelclazz和cmid的对照表
    private _listenings = new Multimap<string, number>();
}

interface MpNode extends Node {

    // mq服务，多人多服必须提供mq的服务
    mqsrv: string;
}

export abstract class Multiplayers extends Socket {

    config(cfg: Node): boolean {
        if (!super.config(cfg))
            return false;
        let c = <MpNode>cfg;
        if (!c.mqsrv) {
            logger.warn("没有配置mq服务器");
            return false;
        }
        this.mqsrv = c.mqsrv;
        return true;
    }

    mqsrv: string;

    // 必须提供事务对象
    protected abstract instanceTransaction(): Transaction;

    protected instanceConnector(): Connector {
        let cnt = new Connector();
        cnt.mqsrv = this.mqsrv;
        return cnt;
    }

    protected onConnectorAvaliable(connector: Connector) {
        super.onConnectorAvaliable(connector);
        connector.avaliable();
    }

    protected onConnectorUnavaliable(connector: Connector) {
        super.onConnectorUnavaliable(connector);
        connector.unavaliable();
    }

    protected onListen(connector: Connector, trans: Transaction, listen: boolean) {
        let model = trans.model;
        if (!model) {
            logger.warn("用来监听的model为null，所以跳过监听处理");
            return;
        }

        if (listen)
            connector.listen(model, trans.modelId());
        else
            connector.listen(model, trans.modelId());
    }
}