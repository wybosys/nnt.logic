import {Find} from "../manager/servers";
import {static_cast} from "../core/core";
import {logger} from "../core/logger";
import {LayerMap} from "../core/kernel";
import {Variant} from "../core/object";

export interface MQClientOption {

    // 支持持久化
    durable?: boolean;

    // 长周期化
    longliving?: boolean;

    // 用来广播的客户端
    transmitter?: boolean;

    // 不修改服务器状态
    passive?: boolean;
}

export interface IMQClient {

    // 打开通道
    open(chann: string, opt?: MQClientOption): Promise<this>;

    // 关闭通道
    close(): void;

    // 订阅消息
    subscribe(cb: (msg: Variant, chann: string) => void): Promise<this>;

    // 取消自身的订阅，一个client只能打开一个订阅
    unsubscribe(): Promise<this>;

    // 产生消息
    produce(msg: Variant): Promise<this>;

    // 广播消息
    broadcast(msg: Variant): Promise<this>;

    // 清楚历史数据
    clear(): Promise<this>;

    // 广播链接中的接收机
    // @connect =true 链接，false 断开链接
    receiver(transmitter: string, connect: boolean): Promise<this>;
}

export interface IMQServer {

    // 构造出客户端
    instanceClient(): IMQClient;
}

// MQ客户端，复用router的机制作为消息传递的媒介
export abstract class AbstractMQClient implements IMQClient {

    async open(chann: string, opt: MQClientOption): Promise<this> {
        if (opt) {
            if ("durable" in opt)
                this.durable = opt.durable;
            if ("longliving" in opt)
                this.longliving = opt.longliving;
            if ("transmitter" in opt)
                this.transmitter = opt.transmitter;
            if ("passive" in opt)
                this.passive = opt.passive;
        }
        return this;
    }

    // 持久化
    durable: boolean = true;

    // 长期留存
    longliving: boolean = true;

    // 消息中心
    transmitter: boolean = false;

    // 不新创建
    passive: boolean = false;

    abstract subscribe(cb: (msg: Variant, chann: string) => void): Promise<this>;

    abstract unsubscribe(): Promise<this>;

    abstract produce(msg: Variant): Promise<this>;

    abstract broadcast(msg: Variant): Promise<this>;

    abstract receiver(transmitter: string, connect: boolean): Promise<this>;

    abstract close(): Promise<void>;

    abstract clear(): Promise<this>;
}

// 订阅消息
export function Acquire(srvid: string): IMQClient {
    let srv = static_cast<IMQServer>(Find(srvid));
    if (srv == null) {
        logger.warn("没有找到mq服务器 {{=it.id}}", {id: srvid});
        return null;
    }
    return srv.instanceClient();
}

// 连接池
let clients = new LayerMap<string, IMQClient>();

export function AcquirePool(srvid: string, chann: string): Promise<IMQClient> {
    return new Promise(resolve => {
        let fnd = clients.getuq(srvid, chann);
        if (!fnd) {
            Acquire(srvid).open(chann).then(client => {
                fnd = client;
                clients.setuq(fnd, srvid, chann);
                resolve(fnd);
            });
        }
        resolve(fnd);
    });
}
