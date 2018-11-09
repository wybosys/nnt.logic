import {Node} from "../config/config";
import {AbstractMQClient, IMQClient, IMQServer, MQClientOption} from "./mq";
import {AbstractServer} from "./server";
import {logger} from "../core/logger";
import {ReusableObjects, Variant} from "../core/object";
import {IndexedObject, KvObject, ObjectT, SyncArray} from "../core/kernel";
import {static_cast} from "../core/core";
import amqplib = require("amqplib");

interface AmqpNode {

    // rabbitmq 的主机名
    host: string;

    // vhost
    vhost?: string;

    // 登录
    user?: string;
    password?: string;

    // 预先创建的通道
    channel?: KvObject<{ type: string, durable: boolean, longliving: boolean }>;

    // 是否使用安全检查
    safe?: boolean;
}

class AmqpmqClient extends AbstractMQClient {

    constructor(hdl: amqplib.Channel, trychannels?: TryChannelPool) {
        super();
        this._hdl = hdl;
        this._trychannels = trychannels;
    }

    protected _hdl: amqplib.Channel;
    protected _tags: string[] = [];
    private _isqueue: boolean;
    private _isexchange: boolean;

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
                        this._isexchange = true;
                        resolve(this);
                    }).catch(logger.warn);
                }
                else {
                    this._hdl.assertQueue(this._chann, {
                        durable: this.durable,
                        autoDelete: !this.longliving
                    }).then(() => {
                        this._isqueue = true;
                        this._hdl.bindQueue(this._chann, "nnt.topic", this._chann).then(() => {
                            resolve(this);
                        }).catch(logger.warn);
                    }).catch(logger.warn);
                }
            });
        });
    }

    protected async checkQueue(name: string) {
        if (!this._trychannels)
            return;
        let tc = await this._trychannels.use();
        await tc.checkQueue(name);
        this._trychannels.unuse(tc);
    }

    protected async checkExchange(name: string) {
        if (!this._trychannels)
            return;
        let tc = await this._trychannels.use();
        await tc.checkExchange(name);
        this._trychannels.unuse(tc);
    }

    protected async checkQueueAndExchange(queue: string, exchange: string) {
        if (!this._trychannels)
            return;
        let tc = await this._trychannels.use();
        await tc.checkQueue(queue);
        await tc.checkExchange(exchange);
        this._trychannels.unuse(tc);
    }

    async subscribe(cb: (msg: Variant, chann: string) => void): Promise<this> {
        try {
            await this.checkQueue(this._chann);
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
        try {
            await this.checkQueue(this._chann);
            if (!this._hdl.sendToQueue(this._chann, msg.toBuffer())) {
                logger.warn("amqp: 发送消息失败");
            }
        } catch (err) {
            //logger.exception(err);
            logger.fatal("amqp-produce: Queue " + this._chann + " 不存在");
        }
        return this;
    }

    // 给通道发消息
    async broadcast(msg: Variant): Promise<this> {
        try {
            await this.checkExchange(this._chann);
            if (!this._hdl.publish(this._chann, "", msg.toBuffer())) {
                logger.warn("amqp: 广播消息失败");
            }
        } catch (err) {
            //logger.exception(err);
            logger.fatal("amqp-broadcast: Exchange " + this._chann + " 不存在");
        }
        return this;
    }

    // 建立群监听
    async receiver(transmitter: string, connect: boolean): Promise<this> {
        try {
            await this.checkQueueAndExchange(this._chann, transmitter);
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

    async close() {
        if (this._isqueue) {
            try {
                await this.checkQueue(this._chann);
                await this._hdl.deleteQueue(this._chann);
            } catch (err) {
                logger.fatal("amqp-close: Queue " + this._chann + " 不存在");
            }
        }
        else if (this._isexchange) {
            try {
                await this.checkExchange(this._chann);
                await this._hdl.deleteExchange(this._chann);
            } catch (err) {
                logger.fatal("amqp-close: Exchange  " + this._chann + " 不存在");
            }
        }
    }

    private _trychannels: TryChannelPool;
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
        if (c.safe || c.safe == null)
            this.safe = true;
        return true;
    }

    host: string;
    vhost: string;
    port: number;
    user: string;
    password: string;
    channel: KvObject<{ type: string, durable: boolean, longliving: boolean }>;
    safe: boolean;

    protected _hdl: amqplib.Connection;
    protected _cnn: amqplib.Channel;

    async start(): Promise<void> {
        let opts: IndexedObject = {
            protocol: 'amqp',
            hostname: this.host,
            port: this.port,
            vhost: this.vhost,
            frameMax: 0,
            heartbeat: 10 // 默认心跳，解决haproxy做lb时的unexcept closed错误
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

                // 如果打开安全设置，则会通过独立的通道来检查关键步骤的可用性，避免notfound导致通信通道被关闭
                if (this.safe) {
                    this._trychannels = new TryChannelPool(this._hdl);
                }

                /* 加上后，当遇到错误时会自动断掉连接
                hdl.on("error", err => {
                    logger.error(err);
                });
                */
                hdl.on("close", () => {
                    logger.log("amqp 关闭了连接");
                });

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

                    /*
                    cnn.on("error", err => {
                        logger.error(err);
                    });
                    */

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
        return new AmqpmqClient(this._cnn, this._trychannels);
    }

    private _trychannels: TryChannelPool;
}

// amqp当发生错误时，会主动断开 https://github.com/squaremo/amqp.node/issues/156
// 目前来看，没有解决的方式。所以框架采用使用独立channel来检查可用性，将检查和工作进行隔离来达到确保安全
class TryChannelPool extends ReusableObjects<TryChannel> {

    constructor(hdl: amqplib.Connection) {
        super();
        this._hdl = hdl;
    }

    protected async instance(): Promise<TryChannel> {
        let cnn = await this._hdl.createChannel();
        return new TryChannel(cnn);
    }

    async unuse(chann: TryChannel) {
        chann = await chann.instance(this._hdl);
        await super.unuse(chann);
    }

    private _hdl: amqplib.Connection;
}

class TryChannel {

    constructor(cnn: amqplib.Channel) {
        this._cnn = cnn;
        cnn.on("close", () => {
            this.closed = true;
        });
    }

    // 复用的时候用来重新创建连接
    closed: boolean;

    async instance(hdl: amqplib.Connection): Promise<this> {
        if (!this.closed)
            return this;
        let cnn = await hdl.createChannel();
        cnn.on("close", () => {
            this.closed = true;
        });
        this._cnn = cnn;
        this.closed = false;
        return this;
    }

    async checkQueue(name: string) {
        return this._cnn.checkQueue(name);
    }

    async checkExchange(name: string) {
        return this._cnn.checkExchange(name);
    }

    private _cnn: amqplib.Channel;
}
