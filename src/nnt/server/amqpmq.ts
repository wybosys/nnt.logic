import {Node} from "../config/config";
import {AbstractMQClient, IMQClient, IMQServer, MQClientOption} from "./mq";
import {AbstractServer} from "./server";
import {logger} from "../core/logger";
import {ReusableObjects, Variant} from "../core/object";
import {Class, IndexedObject, KvObject, ObjectT, SyncArray} from "../core/kernel";
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
}

class AmqpmqClient extends AbstractMQClient {

    constructor(consumers: amqplib.Channel, trychannels: TryChannelPool) {
        super();
        this._consumers = consumers;
        this._trychannels = trychannels;
    }

    // 用来承载消费者的channel
    protected _consumers: amqplib.Channel;

    // 当前客户端实例订阅的消费者列表
    protected _tags: string[] = [];

    // 如果是队列，则队列名
    private _queue: string;

    // 如果是交换器，则交换器名
    private _exchange: string;

    open(chann: string, opt: MQClientOption): Promise<this> {
        return new Promise(resolve => {
            super.open(chann, opt).then(() => {
                if (this.passive) {
                    if (this.transmitter)
                        this._exchange = chann;
                    else
                        this._queue = chann;
                    resolve(this);
                } else if (this.transmitter) {
                    this._trychannels.safe(async hdl => {
                        await hdl.assertExchange(chann, "fanout", {
                            durable: this.durable,
                            autoDelete: !this.longliving
                        });
                        this._exchange = chann;
                        resolve(this);
                    }).catch(err => {
                        logger.warn(err);
                        resolve(null);
                    });
                } else {
                    this._trychannels.safe(async hdl => {
                        await hdl.assertQueue(chann, {
                            durable: this.durable,
                            autoDelete: !this.longliving
                        });
                        this._queue = chann;
                        await hdl.bindQueue(chann, "nnt.topic", chann);
                        resolve(this);
                    }).catch(err => {
                        logger.warn(err);
                        resolve(null);
                    });
                }
            });
        });
    }

    async subscribe(cb: (msg: Variant, chann: string) => void): Promise<this> {
        // 预先检查queue的存在
        try {
            await this._trychannels.safe(async hdl => {
                await hdl.checkQueue(this._queue);
            });
        } catch (err) {
            logger.error(err);
            return this;
        }

        // 使用消费者独立的通道来订阅
        let c = await this._consumers.consume(this._queue, (msg => {
            try {
                if (msg) {
                    let data = msg.content;
                    if (data)
                        cb(new Variant(data), this._queue);
                    this._consumers.ack(msg);
                }
            } catch (err) {
                logger.error(err);
            }
        }));
        this._tags.push(c.consumerTag);
        return this;
    }

    async unsubscribe(): Promise<this> {
        if (this._tags.length) {
            await SyncArray(this._tags).forEach(async e => {
                try {
                    await this._consumers.cancel(e);
                } catch (err) {
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
            await this._trychannels.safe(async hdl => {
                if (!hdl.sendToQueue(this._queue, msg.toBuffer())) {
                    logger.warn("amqp: 发送消息失败");
                }
            });
        } catch (err) {
            logger.fatal("amqp-produce: Queue " + this._queue + " 不存在");
        }
        return this;
    }

    // 给通道发消息
    async broadcast(msg: Variant): Promise<this> {
        try {
            await this._trychannels.safe(async hdl => {
                if (!hdl.publish(this._exchange, "", msg.toBuffer())) {
                    logger.warn("amqp: 广播消息失败");
                }
            });
        } catch (err) {
            logger.fatal("amqp-broadcast: Exchange " + this._exchange + " 不存在");
        }
        return this;
    }

    // 建立群监听
    async receiver(transmitter: string, connect: boolean): Promise<this> {
        try {
            await this._trychannels.safe(async hdl => {
                await hdl.checkQueue(this._queue);
                await hdl.checkExchange(transmitter);

                if (connect) {
                    await hdl.bindQueue(this._queue, transmitter, "");
                } else {
                    await hdl.unbindQueue(this._queue, transmitter, "");
                }
            });
        } catch (err) {
            logger.warn(err);
        }

        return this;
    }

    async close() {
        if (this._queue) {
            try {
                await this._trychannels.safe(async hdl => {
                    await hdl.deleteQueue(this._queue);
                });
            } catch (err) {
                logger.fatal("amqp-close: Queue " + this._queue + " 不存在");
            }
        } else if (this._exchange) {
            try {
                await this._trychannels.safe(async hdl => {
                    await hdl.deleteExchange(this._exchange);
                });
            } catch (err) {
                logger.fatal("amqp-close: Exchange  " + this._exchange + " 不存在");
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
        return true;
    }

    host: string;
    vhost: string;
    port: number;
    user: string;
    password: string;
    channel: KvObject<{ type: string, durable: boolean, longliving: boolean }>;

    // 每一个进程维持一个mq连接
    private _connection: amqplib.Connection;

    // 用来承载消费者的channel
    private _consumers: amqplib.Channel;

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

    private async doConnect(opts: amqplib.Options.Connect): Promise<void> {
        this._connection = await amqplib.connect(opts);
        this._connection.on("close", () => {
            logger.log("amqp 关闭了连接");
        });

        // 如果打开安全设置，则会通过独立的通道来检查关键步骤的可用性，避免notfound导致通信通道被关闭
        this._trychannels = new TryChannelPool(this._connection);

        // 建立初始的信道
        let cnn = await this._connection.createChannel();

        // 建立用来承载消费者的信道
        this._consumers = await this._connection.createChannel();

        cnn.assertExchange("nnt.topic", "topic", {
            durable: true,
            autoDelete: false
        });

        cnn.assertExchange("nnt.direct", "direct", {
            durable: false,
            autoDelete: false
        });

        cnn.assertExchange("nnt.fanout", "fanout", {
            durable: false,
            autoDelete: false
        });

        cnn.assertExchange("nnt.cluster", "fanout", {
            durable: false,
            autoDelete: false
        });

        // 根据配置创建exchange
        if (this.channel) {
            ObjectT.Foreach(this.channel, (e, k) => {
                cnn.assertExchange(k, e.type, {
                    durable: e.durable,
                    autoDelete: !e.longliving
                }).catch(logger.warn);
            });
        }

        logger.info("连接 {{=it.id}}@amqp", {id: this.id});
    }

    async stop(): Promise<void> {
        this.onStop();
        this._connection.close();
        this._connection = null;
    }

    instanceClient(): IMQClient {
        return new AmqpmqClient(this._consumers, this._trychannels);
    }

    private _trychannels: TryChannelPool;
}

// amqp当发生错误时，会主动断开 https://github.com/squaremo/amqp.node/issues/156
// 目前来看，没有解决的方式。所以框架采用使用独立channel来检查可用性，将检查和工作进行隔离来达到确保安全
class TryChannelPool extends ReusableObjects<TryChannel> {

    constructor(connection: amqplib.Connection) {
        super();
        this._connection = connection;
    }

    protected async instance(): Promise<TryChannel> {
        //logger.log("ampq::创建一个复用的Channel");
        let cnn = await this._connection.createChannel();
        return new TryChannel(cnn);
    }

    async use(clazz?: Class<TryChannel>): Promise<TryChannel> {
        return await super.use(clazz);
    }

    async unuse(chann: TryChannel, e?: any) {
        if (e) {
            // 如果是遇到异常的重用，则不进行重用
            logger.log("ampq::抛弃发生错误的Channel");
            return;
        }

        //logger.log("amqp::收回复用Channel");
        await super.unuse(chann);
    }

    private _connection: amqplib.Connection;
}

class TryChannel {

    constructor(cnn: amqplib.Channel) {
        this._cnn = cnn;
    }

    async checkQueue(name: string) {
        return this._cnn.checkQueue(name);
    }

    async checkExchange(name: string) {
        return this._cnn.checkExchange(name);
    }

    async assertQueue(queue: string, options?: amqplib.Options.AssertQueue) {
        return this._cnn.assertQueue(queue, options);
    }

    async deleteQueue(queue: string, options?: amqplib.Options.DeleteQueue) {
        return this._cnn.deleteQueue(queue, options);
    }

    async bindQueue(queue: string, source: string, pattern: string, args?: any) {
        return this._cnn.bindQueue(queue, source, pattern, args);
    }

    async unbindQueue(queue: string, source: string, pattern: string, args?: any) {
        return this._cnn.unbindQueue(queue, source, pattern, args);
    }

    async assertExchange(exchange: string, type: string, options?: amqplib.Options.AssertExchange) {
        return this._cnn.assertExchange(exchange, type, options);
    }

    async deleteExchange(exchange: string, options?: amqplib.Options.DeleteExchange) {
        return this._cnn.deleteExchange(exchange, options);
    }

    async bindExchange(destination: string, source: string, pattern: string, args?: any) {
        return this._cnn.bindExchange(destination, source, pattern, args);
    }

    async unbindExchange(destination: string, source: string, pattern: string, args?: any) {
        return this._cnn.unbindExchange(destination, source, pattern, args);
    }

    publish(exchange: string, routingKey: string, content: Buffer, options?: amqplib.Options.Publish) {
        return this._cnn.publish(exchange, routingKey, content, options);
    }

    sendToQueue(queue: string, content: Buffer, options?: amqplib.Options.Publish) {
        return this._cnn.sendToQueue(queue, content, options);
    }

    async consume(queue: string, onMessage: (msg: amqplib.Message | null) => any, options?: amqplib.Options.Consume) {
        return this._cnn.consume(queue, onMessage, options);
    }

    async cancel(consumerTag: string) {
        return this._cnn.cancel(consumerTag);
    }

    ack(message: amqplib.Message, allUpTo?: boolean) {
        this._cnn.ack(message, allUpTo);
    }

    private _cnn: amqplib.Channel;
}
