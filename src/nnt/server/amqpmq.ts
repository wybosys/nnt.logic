import {Node} from "../config/config";
import {AbstractMQClient, IMQClient, IMQServer, MQClientOption} from "./mq";
import {AbstractServer} from "./server";
import {logger} from "../core/logger";
import {ReusableObjects, Variant} from "../core/object";
import {ArrayT, Class, clazz_type, IndexedObject, KvObject, ObjectT, SyncArray, SyncMap} from "../core/kernel";
import {static_cast} from "../core/core";
import amqplib = require("amqplib");
import log = logger.log;

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

    constructor(consumers: Channels, producers: Channels) {
        super();
        this._consumers = consumers;
        this._producers = producers;
    }

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
                    this._producers.safe(async hdl => {
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
                    this._producers.safe(async hdl => {
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

    // 当前客户端实例订阅的消费者列表
    protected _tags = new Map<string, Channel>();

    async subscribe(cb: (msg: Variant, chann: string) => void): Promise<this> {
        // 预先检查queue的存在
        try {
            await this._consumers.safe(async hdl => {
                await hdl.checkQueue(this._queue);
            });
        } catch (err) {
            logger.error(err);
            return this;
        }

        // 直接获取channbel，消费者-channel实现1对1的关系，不重用
        let chann = await this._consumers.channel();
        await chann.prefetch(1);

        // 使用消费者独立的通道来订阅
        let res = await chann.consume(this._queue, (msg => {
            if (msg) {
                let data = msg.content;
                if (data) {
                    try {
                        cb(new Variant(data), this._queue);
                    } catch (err) {
                        logger.error(err);
                    }
                }
                chann.ack(msg);
            }
        }));
        this._tags.set(res.consumerTag, chann);

        return this;
    }

    async unsubscribe(): Promise<this> {
        if (!this._tags.size)
            return this;

        this._tags.forEach((v, k) => {
            v.cancel(k);
        });
        this._tags.clear();

        return this;
    }

    // 直接给队列发消息
    async produce(msg: Variant): Promise<this> {
        try {
            await this._producers.safe(async hdl => {
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
            await this._producers.safe(async hdl => {
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
            await this._producers.safe(async hdl => {
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
                await this._producers.safe(async hdl => {
                    await hdl.deleteQueue(this._queue);
                });
            } catch (err) {
                logger.fatal("amqp-close: Queue " + this._queue + " 不存在");
            }
        } else if (this._exchange) {
            try {
                await this._producers.safe(async hdl => {
                    await hdl.deleteExchange(this._exchange);
                });
            } catch (err) {
                logger.fatal("amqp-close: Exchange  " + this._exchange + " 不存在");
            }
        }
    }

    async clear(): Promise<this> {
        if (this._queue) {
            try {
                await this._producers.safe(async hdl => {
                    await hdl.purgeQueue(this._queue);
                });
            } catch (err) {
                // 不输出任何日志
            }
        }

        return this;
    }

    private _producers: Channels;
    private _consumers: Channels;
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
        this._producers = new Channels(opts);
        this._consumers = new Channels(opts);

        // 默认打开
        await this._producers.open();
        await this._consumers.open();

        // 建立初始的信道
        let cnn = await this._producers.channel();

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

        this._producers.close();
        this._producers = null;

        this._consumers.close();
        this._consumers = null;
    }

    instanceClient(): IMQClient {
        return new AmqpmqClient(this._consumers, this._producers);
    }

    private _producers: Channels;
    private _consumers: Channels;
}

// 生产者和消费者使用不同的connection池来提供channel
class Channel {

    constructor(channel: amqplib.Channel, connection: Connection) {
        this._channel = channel;
        this._connection = connection;
    }

    async checkQueue(name: string) {
        return this._channel.checkQueue(name);
    }

    async checkExchange(name: string) {
        return this._channel.checkExchange(name);
    }

    async assertQueue(queue: string, options?: amqplib.Options.AssertQueue) {
        return this._channel.assertQueue(queue, options);
    }

    async deleteQueue(queue: string, options?: amqplib.Options.DeleteQueue) {
        return this._channel.deleteQueue(queue, options);
    }

    async bindQueue(queue: string, source: string, pattern: string, args?: any) {
        return this._channel.bindQueue(queue, source, pattern, args);
    }

    async unbindQueue(queue: string, source: string, pattern: string, args?: any) {
        return this._channel.unbindQueue(queue, source, pattern, args);
    }

    async assertExchange(exchange: string, type: string, options?: amqplib.Options.AssertExchange) {
        return this._channel.assertExchange(exchange, type, options);
    }

    async deleteExchange(exchange: string, options?: amqplib.Options.DeleteExchange) {
        return this._channel.deleteExchange(exchange, options);
    }

    async bindExchange(destination: string, source: string, pattern: string, args?: any) {
        return this._channel.bindExchange(destination, source, pattern, args);
    }

    async unbindExchange(destination: string, source: string, pattern: string, args?: any) {
        return this._channel.unbindExchange(destination, source, pattern, args);
    }

    publish(exchange: string, routingKey: string, content: Buffer, options?: amqplib.Options.Publish) {
        return this._channel.publish(exchange, routingKey, content, options);
    }

    sendToQueue(queue: string, content: Buffer, options?: amqplib.Options.Publish) {
        return this._channel.sendToQueue(queue, content, options);
    }

    async purgeQueue(queue: string): Promise<amqplib.Replies.PurgeQueue> {
        return this._channel.purgeQueue(queue);
    }

    async consume(queue: string, onMessage: (msg: amqplib.Message | null) => any, options?: amqplib.Options.Consume) {
        return this._channel.consume(queue, onMessage, options);
    }

    async cancel(consumerTag: string) {
        return this._channel.cancel(consumerTag);
    }

    ack(message: amqplib.Message, allUpTo?: boolean) {
        this._channel.ack(message, allUpTo);
    }

    async prefetch(count: number, global?: boolean): Promise<amqplib.Replies.Empty> {
        return this._channel.prefetch(count, global);
    }

    async close(): Promise<void> {
        return this._channel.close();
    }

    private _channel: amqplib.Channel;
    private _connection: Connection;
}

class Connection {

    constructor(opts: amqplib.Options.Connect) {
        this._opts = opts;
    }

    async open(): Promise<this> {
        this._connection = await amqplib.connect(this._opts);
        return this;
    }

    async channel(): Promise<Channel> {
        let r: Channel = null;
        if (this.channels_count >= this.channels_max) {
            return r;
        }

        try {
            this.channels_count += 1;
            let channel = await this._connection.createChannel();
            r = new Channel(channel, this);
            // 当关闭时，恢复该连接可用
            channel.on('error', () => {
                // pass 不写时，不会激发close的消息
            });
            channel.on('close', () => {
                this.channels_count -= 1;
                this.channels_overflow = false;
            });
        } catch (e) {
            this.channels_count -= 1;
            this.channels_overflow = true;
            //logger.error(e);
        }

        return r;
    }

    close() {
        this._connection.close();
        this._connection = null;
    }

    // 当前channels的数量
    channels_count = 0;

    // 预定义可以打开的最大数量
    channels_max = 1024;

    // 当前不可用
    channels_overflow = false;

    get valid(): boolean {
        return !this.channels_overflow &&
            (this.channels_count < this.channels_max);
    }

    private _opts: amqplib.Options.Connect;
    private _connection: amqplib.Connection;
}

class Channels {

    constructor(opts: amqplib.Options.Connect) {
        this._opts = opts;
        this._connections = new Connections(opts);
    }

    async open(): Promise<Channels> {
        // 打开默认连接
        await this.connection();
        return this;
    }

    // 创建一个新channel
    async channel(): Promise<Channel> {
        let r: Channel = null;
        let retry = 5;
        while (!r && retry--) {
            let connection = await this._connections.connection();
            r = await connection.channel();
        }
        if (!r)
            throw new Error('amqp::channel::创建channel失败');
        return r;
    }

    async connection(): Promise<Connection> {
        return this._connections.connection();
    }

    async use(clazz?: Class<Channel>): Promise<Channel> {
        return this._pool.use(clazz);
    }

    async unuse(chann: Channel, e?: any) {
        return this._pool.unuse(chann, e);
    }

    async safe(cb: (obj: Channel) => Promise<void>, clazz?: Class<Channel>) {
        await this._pool.safe(cb, clazz);
    }

    close() {
        this._connections.close();
        this._pool.clear();
    }

    private _opts: amqplib.Options.Connect;
    private _connections: Connections;
    private _pool = new ChannelPool(this);
}

class Connections {

    constructor(opts: amqplib.Options.Connect) {
        this._opts = opts;
    }

    // 当前可用的连接
    async connection(): Promise<Connection> {
        if (this._connection && !this._connection.valid)
            this._connection = null;

        if (this._connection == null) {
            // 提取组里当前可用的
            this._connection = ArrayT.QueryObject(this._connections, e => {
                return e.valid;
            });

            // 生成新的
            if (this._connection == null) {
                let t = new Connection(this._opts);
                await t.open();
                this._connections.push(t);
                logger.log('amqp::connection::打开一个新连接');

                // 避免并发的问题，打开后再设置到全局打开的连接
                this._connection = t;
            }
        }
        return this._connection;
    }

    close() {
        this._connections.forEach(e => {
            e.close();
        });
        this._connections.length = 0;
        this._connection = null;
    }

    private _opts: amqplib.Options.Connect;
    private _connection: Connection = null;
    private _connections: Connection[] = [];
}

class ChannelPool extends ReusableObjects<Channel> {

    constructor(channels: Channels) {
        super();
        this._channels = channels;
    }

    protected async instance(): Promise<Channel> {
        return this._channels.channel();
    }

    async use(clazz?: Class<Channel>): Promise<Channel> {
        return super.use(clazz);
    }

    async unuse(chann: Channel, e?: any) {
        if (e)
            return;

        await super.unuse(chann);
    }

    private _channels: Channels;
}
