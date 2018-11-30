import {Connector as BaseConnector, Socket, Transaction as BaseTransaction} from "./socket";
import {Node} from "../config/config";
import {logger} from "../core/logger";
import {GetObjectClassName, UUID} from "../core/core";
import {ArrayT, AsyncArray, IndexedObject, Multimap} from "../core/kernel";
import {Acquire, IMQClient, MQClientOption} from "./mq";
import {Variant} from "../core/object";
import {Encode, Output} from "../core/proto";
import {STATUS} from "../core/models";
import {Parellel} from "../core/operation";

export interface IMPMessage {

    // 用户的标识
    u?: string;

    // 条件，对于model，就是所有input的集合，服务端发消息时会严格比对，一样后才发送
    f?: IndexedObject;

    // model的类名
    c: string;

    // model的id
    d?: number;

    // model数据
    p: IndexedObject;

    // 内部消息
    i?: boolean;

    // 状态码
    s?: number;

    // 静默
    q?: boolean;
}

// 多玩家服务需要提供带user区分的事务
export abstract class Transaction extends BaseTransaction {

    // 用户标记
    abstract userIdentifier(): string;

    // 打包model到variant
    static Encode(model: Object): Variant {
        return new Variant({
            c: GetObjectClassName(model),
            p: Output(model),
            f: Encode(model)
        });
    }

    encode(model?: Object): Variant {
        return Transaction.Encode(model ? model : this.model);
    }
}

export const PREFIX_USER = "user.";
export const PREFIX_USER_ONLINE = "user.online.";

export class Connector extends BaseConnector {

    // 用户标记
    userIdentifier: string;

    // 使用的mq服务
    mqsrv: string;

    // 是否允许多端登陆 Single User Multi Devices
    sumd: boolean = false;

    // 客户端的连接的唯一id
    device = UUID();

    // 是否是多端登陆正在退出
    isSumdClosing: boolean;

    // socket长连后，使用同一个登录信息初始化每次的API请求
    init(trans: Transaction): boolean {
        if (!trans.auth())
            return false;
        let r = super.init(trans);
        this.userIdentifier = trans.userIdentifier();
        return r;
    }

    // mmo使用的基础mq通道
    protected _mqA: IMQClient;
    protected _mqB: IMQClient;
    protected _mqC: IMQClient;

    // 客户端快速连接/断开会因为mq连接的异步性，导致客户端断开后才建立起mq通道，所以提供保护的连接
    protected async acquire(chann: string, opts: IndexedObject): Promise<IMQClient> {
        try {
            let mq = await Acquire(this.mqsrv).open(chann, opts);
            if (this.isClosed) {
                return null;
            } else {
                return mq;
            }
        } catch (err) {
            // pass
        }
        return null;
    }

    // 成功建立连接
    async avaliable() {
        // 建立mq服务器
        // Z users.online <AD|fanout>
        // Y users <D|fanout>
        // B user.online.<uid> <AD|topic>
        // A user.<uid> <D|topic>

        logger.log("开始创建用户通道 " + this.userIdentifier);
        await Parellel()
            .async(async () => {
                // 用户的持久性消息通道（通常用来投递关键消息)
                let mq = await this.acquire("user." + this.userIdentifier, {
                    durable: true,
                    longliving: true
                });
                if (mq) {
                    this._mqA = mq;
                    mq.subscribe(data => {
                        this.processData(data);
                    });
                    mq.receiver("users", true);
                }
            })
            .async(async () => {
                // 用户独立在线通道(下线时自动断开，用来投递即时消息)
                let mq = await this.acquire("user.online." + this.userIdentifier, {
                    durable: false,
                    longliving: false
                });
                if (mq) {
                    this._mqB = mq;
                    // 清楚没有删掉的queue接受的数据
                    await mq.clear();
                    // 定于通知自己的消息
                    await mq.subscribe(data => {
                        this.processData(data);
                    });
                    // 接受通知所有在线用户的消息
                    await mq.receiver("users.online", true);
                }
            })
            .run();
        logger.log("完成创建用户通道 " + this.userIdentifier);

        // 多机通道，同一个用户登录不同客户端时相互发送消息的通道)
        this.acquire("user.online." + this.userIdentifier, {
            transmitter: true,
            longliving: false,
            durable: false
        }).then(mqsumd => {
            if (!mqsumd)
                return;
            // 多机通道下的单机独立队列
            this.acquire("user.online." + this.userIdentifier + "." + this.device, {
                durable: false,
                longliving: false
            }).then(mq => {
                if (!mq)
                    return;
                this._mqC = mq;
                mq.subscribe(data => {
                    this.processData(data);
                });
                mq.receiver("user.online." + this.userIdentifier, true);

                // 禁止多端需要发送登陆消息用来在其他已经连接的客户端处理下线操作
                if (!this.sumd) {
                    mqsumd.broadcast(new Variant({
                        i: true,
                        p: {d: this.device, u: this.userIdentifier},
                        c: "user.online"
                    }));
                }
            });
        });
    }

    protected checkfilter(l: IndexedObject, r: IndexedObject): boolean {
        if (!l || !r)
            return false;
        let lkeys = Object.keys(l);
        let rkeys = Object.keys(r);
        if (lkeys.length != rkeys.length)
            return false;
        let fnd = ArrayT.QueryObject(lkeys, e => {
            let lv = l[e];
            let rv = r[e];
            return lv != rv;
        });
        return fnd == null;
    }

    protected processData(data: Variant) {
        let jsobj: IMPMessage = <any>data.toJsObj();
        if (!jsobj)
            return;
        if (jsobj.i) {
            if (!this.sumd) {
                if (jsobj.c == "user.online") {
                    if (jsobj.p && jsobj.p.u == this.userIdentifier) {
                        if (jsobj.p.d != this.device) {
                            // 需要下线当前客户端
                            this.isSumdClosing = true;
                            this.close(STATUS.MULTIDEVICE);
                        }
                    }
                }
            }
            return;
        }
        // 指定了modelid，如果查找到，则直接发送
        if (jsobj.d) {
            if (this._listenings.contains(jsobj.c, jsobj.d)) {
                // 判断是否符合过滤规则
                if (jsobj.f) {
                    let info = this._modelinfos.get(jsobj.d);
                    if (!this.checkfilter(info.f, jsobj.f))
                        return;
                }
                this.send(data.toBuffer());
            } else {
                logger.warn("没有找到客户端对modelid的监听");
                return;
            }
        }
        // 制定了class，遍历所有的监听
        let arr = this._listenings.get(jsobj.c);
        if (arr && arr.length) {
            if (jsobj.f) {
                arr.forEach(e => {
                    let info = this._modelinfos.get(e);
                    if (!this.checkfilter(info.f, jsobj.f))
                        return;
                    let t = {
                        d: e,
                        p: jsobj.p
                    };
                    this.send(new Variant(t).toBuffer());
                });
            } else {
                // 转发独立通道
                arr.forEach(e => {
                    let t = {
                        d: e,
                        p: jsobj.p,
                        f: jsobj.f
                    };
                    this.send(new Variant(t).toBuffer());
                });
            }
        }
    }

    // 连接断开，回收资源
    async unavaliable() {
        if (this._mqA) {
            this._mqA.unsubscribe();
            this._mqA = null;
        }

        if (this._mqB) {
            this._mqB.unsubscribe();
            if (!this.isSumdClosing)
                this._mqB.close();
            this._mqB = null;
        }

        if (this._mqC) {
            // 取消普通得监听
            this._mqC.unsubscribe();
            this._mqC.receiver("user.online." + this.userIdentifier, false);

            // 关闭连接
            this._mqC.close();
            this._mqC = null;
        }

        // 每一次连接成功都会重新建立监听，所以断开时需要清空
        this._listenings.clear();
        this._modelinfos.clear();
    }

    // 建立对模型的监听
    listen(model: any, mid: number): boolean {
        // 已经监听
        if (this._modelinfos.has(mid))
            return false;

        let name = GetObjectClassName(model);
        let inputs = Encode(model);
        this._listenings.push(name, mid);
        this._modelinfos.set(mid, {f: inputs});
        return true;
    }

    // 取消对模型的监听
    unlisten(model: any, mid: number): boolean {
        if (!this._modelinfos.has(mid))
            return false;
        let name = GetObjectClassName(model);
        this._listenings.pop(name, mid);
        this._modelinfos.delete(mid);
        return true;
    }

    // 保存所有listen的modelclazz和cmid的对照表
    private _listenings = new Multimap<string, number>();

    // cmid和输入参数对照
    private _modelinfos = new Map<number, { f: IndexedObject }>();
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

    // 用来建立消息队列的服务器名称，配置在app.json中
    mqsrv: string;

    // 必须提供事务对象
    protected abstract instanceTransaction(): Transaction;

    // 实例化连接对象
    protected instanceConnector(): Connector {
        return new Connector();
    }

    protected async onConnectorAvaliable(connector: Connector) {
        // 绑定mq服务，后面会自动打开消息通道
        connector.mqsrv = this.mqsrv;
        await super.onConnectorAvaliable(connector);

        // 准备消息通道等（同步处理，避免客户端立即处理相关通信，但是服务端尚未建立成功)
        await connector.avaliable();

        logger.log("{{=it.userIdentifier}} 连接服务器", connector);
    }

    protected async onConnectorUnavaliable(connector: Connector) {
        super.onConnectorUnavaliable(connector);

        // 断开消息通道（可以异步处理）
        connector.unavaliable();

        logger.log("{{=it.userIdentifier}} 断开连接", connector);
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
            connector.unlisten(model, trans.modelId());
    }

    static AcquireUser(mqsrv: string, uid: string): Promise<IMQClient> {
        return Acquire(mqsrv).open(PREFIX_USER + uid, {
            passive: true
        });
    }

    static AcquireOnlineUser(mqsrv: string, uid: string, opt?: MQClientOption): Promise<IMQClient> {
        return Acquire(mqsrv).open(PREFIX_USER_ONLINE + uid, {
            passive: true
        });
    }
}
