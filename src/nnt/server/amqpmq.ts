import {Node} from "../config/config";
import {AbstractMQClient, IMQClient, IMQServer, MQClientOption} from "./mq";
import {AbstractServer} from "./server";
import {logger} from "../core/logger";
import {Variant} from "../core/object";
import {IndexedObject, KvObject, ObjectT, SyncArray} from "../core/kernel";
import {static_cast} from "../core/core";
import amqplib = require("amqplib");

interface AmqpNode {
    host: string;
    vhost?: string;
    user?: string;
    password?: string;
    channel?: KvObject<{ type: string, durable: boolean, longliving: boolean }>;
}

class AmqpmqClient extends AbstractMQClient {

    constructor(hdl: amqplib.Channel) {
        super();
        this._hdl = hdl;
    }

    protected _hdl: amqplib.Channel;
    protected _tags = new Array<string>();

    open(chann: string, opt: MQClientOption): Promise<this> {
        return new Promise(resolve => {
            super.open(chann, opt).then(() => {
                if (this.passive) {
                    resolve(this);
                }
                else if (this.transmitter) {
                    this._hdl.assertExchange(this._chann, "fanout", {
                        durable: this.durable,
                        autoDelete: !this.longliving
                    }).then(() => {
                        resolve(this);
                    }).catch(logger.warn);
                }
                else {
                    this._hdl.assertQueue(this._chann, {
                        durable: this.durable,
                        autoDelete: !this.longliving
                    }).then(() => {
                        this._hdl.bindQueue(this._chann, "nnt.topic", this._chann).then(() => {
                            resolve(this);
                        }).catch(logger.warn);
                    }).catch(logger.warn);
                }
            });
        });
    }

    async subscribe(cb: (msg: Variant, chann: string) => void): Promise<this> {
        try {
            let c = await this._hdl.consume(this._chann, (msg => {
                try {
                    let data = msg.content;
                    if (data)
                        cb(new Variant(data), this._chann);
                } catch (err) {
                    logger.error(err);
                }
                this._hdl.ack(msg);
            }));
            this._tags.push(c.consumerTag);
        }
        catch (err) {
            logger.warn(err);
        }
        return this;
    }

    async unsubscribe(): Promise<this> {
        if (this._tags.length) {
            await SyncArray(this._tags).forEach(async e => {
                try {
                    await this._hdl.cancel(e);
                }
                catch (err) {
                    logger.warn(err);
                }
            });
            this._tags.length = 0;
        }
        return this;
    }

    // 直接给队列发消息
    async produce(msg: Variant): Promise<this> {
        if (!this._hdl.sendToQueue(this._chann, msg.toBuffer())) {
            logger.warn("amqp: 发送消息失败");
        }
        return this;
    }

    // 给通道发消息
    async broadcast(msg: Variant): Promise<this> {
        if (!this._hdl.publish(this._chann, "", msg.toBuffer())) {
            logger.warn("amqp: 广播消息失败");
        }
        return this;
    }

    // 建立群监听
    async receiver(transmitter: string, connect: boolean): Promise<this> {
        try {
            if (connect) {
                await this._hdl.bindQueue(this._chann, transmitter, "");
            }
            else {
                await this._hdl.unbindQueue(this._chann, transmitter, "");
            }
        }
        catch (err) {
            logger.warn(err);
        }
        return this;
    }
}

export class Amqpmq extends AbstractServer implements IMQServer {

    config(cfg: Node): boolean {
        if (!super.config(cfg))
            return false;
        let c = static_cast<AmqpNode>(cfg);
        if (!c.host)
            return false;
        let arr = c.host.split(":");
        this.host = arr[0];
        this.port = arr.length == 2 ? parseInt(arr[1]) : 5672;
        this.user = c.user;
        this.password = c.password;
        this.vhost = c.vhost ? c.vhost : "/";
        this.channel = c.channel;
        return true;
    }

    host: string;
    vhost: string;
    port: number;
    user: string;
    password: string;
    channel: KvObject<{ type: string, durable: boolean, longliving: boolean }>;

    protected _hdl: amqplib.Connection;
    protected _cnn: amqplib.Channel;

    async start(): Promise<void> {
        let opts: IndexedObject = {
            protocol: 'amqp',
            hostname: this.host,
            port: this.port,
            vhost: this.vhost,
            frameMax: 0,
            heartbeat: 0
        };
        if (this.user) {
            opts.username = this.user;
            opts.password = this.password;
        }
        await this.doConnect(opts);
        this.onStart();
    }

    private doConnect(opts: amqplib.Options.Connect): Promise<void> {
        return new Promise(resolve => {
            amqplib.connect(opts).then(hdl => {
                this._hdl = hdl;
                logger.info("连接 {{=it.id}}@amqp", {id: this.id});

                // 建立初始的通道
                hdl.createChannel().then(cnn => {
                    this._cnn = cnn;

                    cnn.assertExchange("nnt.topic", "topic", {
                        durable: true,
                        autoDelete: false
                    }).catch(logger.warn);

                    cnn.assertExchange("nnt.direct", "direct", {
                        durable: false,
                        autoDelete: false
                    }).catch(logger.warn);

                    cnn.assertExchange("nnt.fanout", "fanout", {
                        durable: false,
                        autoDelete: false
                    }).catch(logger.warn);

                    cnn.assertExchange("nnt.cluster", "fanout", {
                        durable: false,
                        autoDelete: false
                    }).catch(logger.warn);

                    // 根据配置创建exchange
                    if (this.channel) {
                        ObjectT.Foreach(this.channel, (e, k) => {
                            cnn.assertExchange(k, e.type, {
                                durable: e.durable,
                                autoDelete: !e.longliving
                            }).catch(logger.warn);
                        });
                    }

                    // 掉线重连
                    cnn.on("close", () => {
                        logger.log("{{=it.id}}@amqp 尝试重新打开CHANNEL", {id: this.id});
                        // channel能自动连上，但是之前已经建立好的producer/consumer不能自动连接，所以之后需要处理为服务器自动重启
                        hdl.createChannel().then(cnn => {
                            this._cnn = cnn;
                        });
                    });

                    cnn.on("error", err => {
                        logger.error(err);
                    });

                    resolve();
                });
            });
        });
    }

    async stop(): Promise<void> {
        this.onStop();
        this._cnn.close();
        this._cnn = null;
        this._hdl.close();
        this._hdl = null;
    }

    instanceClient(): IMQClient {
        return new AmqpmqClient(this._cnn);
    }

}
