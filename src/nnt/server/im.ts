// 即时聊天服务器
import {AbstractServer, IConsoleServer} from "./server";
import {Node} from "../config/config";
import {logger} from "../core/logger";
import {Find} from "../manager/servers";
import {Message, MidInfo} from "../core/models";
import {Transaction} from "./transaction";
import {AcEntity} from "../acl/acl";
import {ImService} from "./rest/imservice";
import {IRouterable} from "./routers";
import {ObjectT} from "../core/kernel";

export const SYSTEM = "0";
export const DOMAIN_USERS = "users";
export const DOMAIN_USERS_ONLINE = "onlineusers";
export const DOMAIN_GROUPS = "groups";
export const DOMAIN_ROOMS = "rooms";
export const SUPPORT_DOMAINS = [DOMAIN_USERS, DOMAIN_USERS_ONLINE, DOMAIN_GROUPS, DOMAIN_ROOMS];

// 内部定义的域
export const DOMAIN_CLUSTERS = "clusters";

interface ImNode extends Node {
    // 绑定到哪一台rest服务器上
    attach: string;
}

export interface IImCallback {

    // 发送成功的回调
    onPosted(msg: Message): void;
}

// 配置中需要提供im.messages的数据库节点
export abstract class Im extends AbstractServer implements IConsoleServer {

    constructor() {
        super();
    }

    attach: string;
    attached: IRouterable & IConsoleServer;

    config(cfg: Node): boolean {
        if (!super.config(cfg))
            return false;
        if (!this.isvalid) {
            logger.fatal("不能直接实例化Im类，需要客户端实现必备接口");
            return false;
        }
        /*
        if (!DbFind(IM_DBID)) {
            logger.fatal("使用了IM服务，但是没有配置对应的数据库访问 {{=it.im}}", {im: IM_DBID});
            return false;
        }
        */
        let c = <ImNode>cfg;
        if (!c.attach) {
            logger.fatal("没有配置IM服务器绑定的Rest服务节点");
            return false;
        }
        this.attach = c.attach;
        return true;
    }

    private _service: ImService;
    get service(): ImService {
        if (!this._service)
            this._service = this.instaceService();
        return this._service;
    }

    protected instaceService(): ImService {
        return new ImService(this);
    }

    async start(): Promise<void> {
        let srv = Find(this.attach);
        if (!srv || !ObjectT.HasKey(srv, "routers")) {
            logger.fatal("没有找到配置的IM绑定服务器 {{=it.id}}", {id: this.attach});
            return;
        }
        this.attached = <any>srv;
        this.attached.routers.register(this.service);
        logger.info("IM服务器绑定到 {{=it.id}}", {id: this.attach});
        this.onStart();
    }

    async stop(): Promise<void> {
        this.attached.routers.unregister(this.service.action);
        this.onStop();
    }

    // 判断双方有没有关系
    abstract isvalid(from: MidInfo, to: MidInfo): Promise<boolean>;

    // 通过trans来获得mid
    abstract mid(trans: Transaction): MidInfo;

    invoke(params: any, req: any, rsp: any, ac?: AcEntity): void {
        this.attached.invoke(params, req, rsp, ac);
    }

    // 发送成功
    protected onPosted(msg: Message) {
    }
}