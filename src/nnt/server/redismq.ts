import {AbstractServer} from "./server";
import {AbstractMQClient, IMQClient, IMQServer} from "./mq";
import {Node} from "../config/config";
import {logger} from "../core/logger";
import {Variant} from "../core/object";
import redis = require("redis");

class RedisClient extends AbstractMQClient {

    constructor(hdl: redis.RedisClient) {
        super();
        this._hdl = hdl;
    }

    protected _hdl: redis.RedisClient;

    close() {
        this._hdl.quit();
        this._hdl = null;
    }

    subscribe(cb: (msg: any, chann: string) => void): Promise<this> {
        return new Promise(resolve => {
            let chann = this._chann;
            if (chann.indexOf("*") != -1) {
                this._hdl.psubscribe(chann, err => {
                    if (err)
                        logger.warn(err.message);
                    resolve(this);
                });
                this._hdl.on("pmessage", (pat, ch, msg) => {
                    if (pat == chann) {
                        cb(msg, ch);
                    }
                });
            }
            else {
                this._hdl.subscribe(chann, err => {
                    if (err)
                        logger.warn(err.message);
                    resolve(this);
                });
                this._hdl.on("message", (ch, msg) => {
                    if (ch == chann) {
                        cb(msg, ch);
                    }
                });
            }
        });
    }

    unsubscribe(): Promise<this> {
        return new Promise(resolve => {
            this._hdl.unsubscribe(this._chann, err => {
                if (err)
                    logger.warn(err.message);
                resolve(this);
            });
        });
    }

    produce(msg: Variant): Promise<this> {
        return new Promise(resolve => {
            this._hdl.publish(this._chann, msg.toString(), err => {
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
}

interface RedisNode extends Node {
    // 服务器地址
    host: string;
}

export class Redismq extends AbstractServer implements IMQServer {

    config(cfg: Node): boolean {
        if (!super.config(cfg))
            return false;
        let c = <RedisNode>cfg;
        if (!c.host)
            return false;
        let arr = c.host.split(":");
        this.host = arr[0];
        this.port = arr.length == 2 ? parseInt(arr[1]) : 6379;
        return true;
    }

    host: string;
    port: number;
    protected _hdl: redis.RedisClient;
    protected _opts: redis.ClientOpts;

    async start(): Promise<void> {
        this._opts = {host: this.host, port: this.port};
        let hdl = redis.createClient(this._opts);
        hdl.on('error', err => {
            logger.info("遇到错误 {{=it.id}}@redismq", {id: this.id});
            logger.error(err);
        });
        hdl.on('ready', () => {
            this._hdl = hdl;
            logger.info("连接 {{=it.id}}@redismq", {id: this.id});
        });
        this.onStart();
    }

    async stop(): Promise<void> {
        this.onStop();
        this._hdl.end(true);
        this._hdl = null;
    }

    instanceClient(): IMQClient {
        let hdl = redis.createClient(this._opts);
        return new RedisClient(hdl);
    }

}