import mosca = require("mosca");
import mqtt = require("mqtt");
import pattern = require("mqtt-pattern");
import {Node} from "../config/config";
import {AbstractServer} from "./server";
import {AbstractDbms} from "../store/store";
import {Find} from "../manager/dbmss";
import {KvMongo} from "../store/kvmongo";
import {logger} from "../core/logger";
import {AbstractMQClient, IMQClient, IMQServer} from "./mq";
import {IndexedObject} from "../core/kernel";
import {Variant} from "../core/object";

interface MoscaNode extends Node {

    // 监听
    host?: string;
    port?: number;

    // 指向配置得数据库服务
    dbms: string;

    // 订阅持久化的目标
    table?: string;
}

class MoscaClient extends AbstractMQClient {

    constructor(setting: IndexedObject) {
        super();
        this._cnn = mqtt.connect(null, {host: setting.host, port: setting.port});
    }

    close() {
        this._cnn.end(false);
        this._cnn = null;
    }

    subscribe(cb: (msg: Variant, chann: string) => void): Promise<this> {
        return new Promise(resolve => {
            let chann = this._chann;
            this._cnn.subscribe(chann, err => {
                if (err)
                    logger.warn(err.message);
                resolve(this);
            });
            this._cnn.on('message', function (topic, msg) {
                if (pattern.matches(chann, topic)) {
                    // 此时的this其实是MqttClient，所以不能用ts的函数形式
                    cb(new Variant(msg), topic);
                }
            });
        });
    }

    unsubscribe(): Promise<this> {
        return new Promise(resolve => {
            this._cnn.unsubscribe(this._chann, err => {
                if (err)
                    logger.warn(err.message);
                resolve(this);
            });
        });
    }

    produce(msg: Variant): Promise<this> {
        return new Promise(resolve => {
            this._cnn.publish(this._chann, msg.toBuffer(), err => {
                if (err)
                    logger.warn(err.message);
                resolve(this);
            });
        });
    }

    broadcast(msg: Variant): Promise<this> {
        return new Promise(resolve => {
            resolve(this);
        });
    }

    receiver(transmitter: string, connect: boolean): Promise<this> {
        return new Promise(resolve => {
            resolve(this);
        });
    }

    protected _cnn: mqtt.Client;
}

export class Moscamq extends AbstractServer implements IMQServer {

    config(cfg: Node): boolean {
        if (!super.config(cfg))
            return false;
        let c = <MoscaNode>cfg;
        this.dbms = Find(c.dbms);
        if (!this.dbms)
            return false;
        this.table = c.table || "pubsub";
        this.host = c.host || "localhost";
        this.port = c.port || 1883;
        // 判断是不是支持得类型
        if (this.dbms instanceof KvMongo)
            return true;
        logger.fatal("Moscamq配置了不支持的数据库");
        return false;
    }

    dbms: AbstractDbms;
    table: string;
    host: string;
    port: number;

    protected _hdl: mosca.Server;

    async start(): Promise<void> {
        let backend: IndexedObject = {};
        if (this.dbms instanceof KvMongo) {
            backend["type"] = "mongo";
            //backend["url"] = this.dbms.url;
            backend["pubsubCollection"] = this.table;
            backend["mongo"] = {};
        }
        let setting = {
            "host": this.host,
            "port": this.port,
            "backend": backend
        };
        this._hdl = new mosca.Server(setting);
        this._hdl.on("ready", () => {
            logger.log("启动 {{=it.id}}@moscamq", {id: this.id});
        });
        this._hdl.on("error", err => {
            logger.warn("启动失败 {{=it.id}}@moscamq", {id: this.id});
        });
        this.onStart();
    }

    async stop(): Promise<void> {
        this.onStop();
        this._hdl.close();
        this._hdl = null;
    }

    instanceClient(): IMQClient {
        let setting = {
            clean: false,
            host: this.host,
            port: this.port
        };
        return new MoscaClient(setting);
    }
}