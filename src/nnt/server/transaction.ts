import {FindAction, IRouter} from "../core/router";
import {IsNeedAuth} from "../core/proto";
import {logger} from "../core/logger";
import {AbstractServer} from "./server";
import {STATUS} from "../core/models";
import {Class, IndexedObject} from "../core/kernel";
import {AcEntity} from "../acl/acl";
import {CancelDelay, DateTime, Delay, DelayHandler} from "../core/time";
import {Config} from "../manager/config";
import {promise} from "../core/core";
import {AbstractParser} from "./parser/parser";
import {AbstractRender} from "./render/render";

export const RESPONSE_SID = "X-NntLogic-SessionId";

export enum DeviceType {
    UNKNOWN = 0,
    IOS = 1,
    ANDROID = 2,
}

export class TransactionInfo {

    // 客户端代码
    agent: string; // 全小写
    ua: string; // 原始ua

    // 访问的主机
    host: string;
    origin: string;

    // 客户端的地址
    addr: string;

    // 来源
    referer: string;
    path: string;

    // 设备机型
    private _deviceType: DeviceType;
    get deviceType(): DeviceType {
        if (this._deviceType != null)
            return this._deviceType;
        if (this.agent.indexOf('iphone') != -1) {
            this._deviceType = DeviceType.IOS;
        } else if (this.agent.indexOf('ipad') != -1) {
            this._deviceType = DeviceType.IOS;
        } else if (this.agent.indexOf('android') != -1) {
            this._deviceType = DeviceType.ANDROID;
        } else {
            this._deviceType = DeviceType.UNKNOWN;
        }
        return this._deviceType;
    }
}

export interface TransactionSubmitOption {

    // 仅输出模型
    model?: boolean;

    // 直接输出数据
    raw?: boolean;

    // 输出的类型
    type?: string;
}

export abstract class Transaction {

    constructor() {
        this.waitTimeout();
    }

    // 返回事务用来区分客户端的id，通常业务中实现为sid
    abstract sessionId(): string;

    // 获得同意个sid之下的客户端的id，和sid结合起来保证唯一性，即 sid.{cid}
    clientId(): string {
        return this.params["_cid"];
    }

    // 是否是新连接上的客户端(包括客户端重启)
    newOneClient(): boolean {
        return this.params["_noc"] == "1";
    }

    // 执行权限
    ace?: AcEntity;

    // 动作
    private _action: string;
    get action(): string {
        return this._action;
    }

    set action(act: string) {
        this._action = act;
        let p = this._action.split(".");
        this.router = (p[0] || "null").toLowerCase();
        this.call = (p[1] || "null").toLowerCase();
    }

    // 映射到router的执行器中
    router: string;
    call: string;

    // 参数
    params: IndexedObject;

    // 执行的结果
    status: number = STATUS.UNKNOWN;

    // 错误信息
    message?: string;

    // 额外数据
    payload: any;

    // 输出和输入的model
    model: any;

    // 基于哪个服务器运行
    server: AbstractServer;

    // 是否需要压缩
    gzip: boolean;

    // 是否已经压缩
    compressed: boolean;

    // 需要打开频控
    frqctl: boolean;

    // 是否暴露接口（通常只有登录会设置为true)
    expose: boolean;

    // 此次的时间
    time = DateTime.Now();

    // 恢复到model, 返回错误码
    modelize(r: IRouter): number {
        // 恢复模型
        let ap = FindAction(r, this.call);
        if (!ap)
            return STATUS.ACTION_NOT_FOUND;
        this.frqctl = ap.frqctl;
        this.expose = ap.expose;

        let clz = ap.clazz;

        // 检查输入参数
        let sta = this.parser.checkInput(clz.prototype, this.params);
        if (sta != STATUS.OK)
            return sta;

        // 填入数据到模型
        this.model = new clz();
        try {
            this.parser.fill(this.model, this.params, true, false);
        } catch (err) {
            this.model = null;
            logger.fatal(err.toString());
            return STATUS.MODEL_ERROR;
        }

        return STATUS.OK;
    }

    // 恢复上下文，涉及到数据的恢复，所以是异步模式
    collect(): Promise<void> {
        return new Promise<void>(resolve => (resolve()));
    }

    // 验证
    needAuth(): boolean {
        return IsNeedAuth(this.model);
    }

    // 是否已经授权
    abstract auth(): boolean;

    // 需要业务层实现对api的流控，避免同一个api瞬间调用多次，业务层通过重载lock/unlock实现
    // lock当即将调用api时由其他逻辑调用
    lock(): Promise<boolean> {
        return promise(true);
    }

    unlock() {
        // pass
    }

    // 同步模式会自动提交，异步模式需要手动提交
    implSubmit: (opt?: TransactionSubmitOption) => void;
    private _submited: boolean;
    private _submited_timeout: boolean;

    async submit(opt?: TransactionSubmitOption) {
        if (this._submited) {
            if (!this._submited_timeout)
                logger.warn("数据已经发送");
            return;
        }
        if (this._timeout) {
            CancelDelay(this._timeout);
            this._timeout = null;
            this._submited_timeout = true;
        }
        this._submited = true;
        this._outputed = true;
        if (this.hookSubmit) {
            try {
                await this.hookSubmit();
            } catch (err) {
                logger.exception(err);
            }
        }
        this.implSubmit(opt);

        // 只有打开了频控，并且此次是正常操作，才解锁
        if (this.frqctl && this.status != STATUS.HFDENY)
            this.unlock();
    }

    // 当提交的时候修改
    hookSubmit: () => Promise<void>;

    // 输出文件
    implOutput: (type: string, obj: any) => void;
    private _outputed: boolean;

    output(type: string, obj: any) {
        if (this._outputed) {
            logger.warn("api已经发送");
            return;
        }
        if (this._timeout) {
            CancelDelay(this._timeout);
            this._timeout = null;
        }
        this._outputed = true;
        this._submited = true;
        this.implOutput(type, obj);
    }

    protected waitTimeout() {
        this._timeout = Delay(Config.TRANSACTION_TIMEOUT, () => {
            this._cbTimeout();
        });
    }

    // 部分api本来时间就很长，所以存在自定义timeout的需求
    timeout(seconds: number) {
        if (this._timeout) {
            CancelDelay(this._timeout);
            this._timeout = null;
        }
        if (seconds == -1)
            return;
        this._timeout = Delay(seconds, () => {
            this._cbTimeout();
        });
    }

    private _cbTimeout() {
        logger.warn("{{=it.action}} 超时", {action: this.action});
        this.status = STATUS.TIMEOUT;
        this.submit();
    }

    // 超时定时器
    private _timeout: DelayHandler;

    // 运行在console中
    console: boolean;

    // 带上此次请求事务的参数实例化一个模型
    // 通常业务层中会对params增加一些数据，来满足trans对auth、context的需求，如果直接new对象的化，就没办法加入这些数据
    instance<T>(cls: Class<T>): T {
        return new cls();
    }

    // 环境信息
    info = new TransactionInfo();

    // 是否把sid返回客户端
    responseSessionId: boolean;

    // 静默模式，不输出回调
    quiet: boolean;

    // 用来解析传入数据
    parser: AbstractParser;

    // 用来构建输出
    render: AbstractRender;
}

export class EmptyTransaction extends Transaction {

    waitTimeout() {
        // pass
    }

    sessionId(): string {
        return null;
    }

    auth(): boolean {
        return false;
    }
}
