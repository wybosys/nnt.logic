import {Rest} from "../server/rest";
import {Node} from "../config/config";
import {RequireDirectory, static_cast} from "../core/core";
import {Find} from "../manager/servers";
import {logger} from "../core/logger";
import {IRouterable} from "../server/routers";
import {RSdk} from "./rsdk";
import {Class, IndexedMap, IndexedObject} from "../core/kernel";
import {Channel} from "./channel";
import {expand} from "../core/url";

interface SdkConfig {

    // 绑定的api服务，如果不设置，则仅通过自身的监听提供服务
    restsrv?: string;

    // 使用的数据库服务
    dbsrv: string;

    // image处理服务
    imgsrv: string;

    // 使用的消息通道
    mqsrv: string;

    // 渠道配置
    channel: IndexedObject[];
}

let _channels = new Map<string, Class<Channel>>();

export function RegisterChannel(id: string, clz: Class<Channel>) {
    _channels.set(id, clz);
}

// 加载渠道的实现
RequireDirectory(expand("entry://nnt/sdk/impl/"));

export class Sdk extends Rest {

    constructor() {
        super();
        this.routers.register(this._svc);
    }

    private _svc = new RSdk(this);
    protected _impls = new IndexedMap<string, Channel>();

    channel(id: string): Channel {
        return this._impls.get(id);
    }

    channels() {
        return this._impls.sync();
    }

    config(cfg: Node): boolean {
        if (!super.config(cfg))
            return false;
        let c = static_cast<SdkConfig>(cfg);
        if (!c.dbsrv)
            return false;
        this.dbsrv = c.dbsrv;
        this.mqsrv = c.mqsrv;
        if (c.restsrv) {
            if (!Find(c.restsrv)) {
                logger.fatal("没有找到服务 {{=it.restsrv}}", c);
                return false;
            }
            this.restsrv = c.restsrv;
        }
        if (c.imgsrv) {
            if (!Find(c.imgsrv)) {
                logger.fatal("没有找到服务 {{=it.imgsrv}}", c);
                return false;
            }
            this.imgsrv = c.imgsrv;
        }

        // 加载渠道信息
        this._impls.clear();
        c.channel && c.channel.forEach(e => {
            let clz = _channels.get(e.id);
            if (clz == null) {
                logger.fatal("sdk没有找到注册实现 {{=it.id}}", e);
                return;
            }
            let t = new clz(this);
            if (!t.config(e)) {
                logger.fatal("sdk实现配置失败 {{=it.id}}", e);
                return;
            }
            this._impls.set(e.id, t);
        });
        return true;
    }

    async start(): Promise<void> {
        let srv = static_cast<IRouterable>(Find(this.restsrv));
        srv.routers.register(this._svc);
        await super.start();
    }

    async stop(): Promise<void> {
        let srv = static_cast<IRouterable>(Find(this.restsrv));
        srv.routers.unregister(this._svc.action);
        await super.stop();
    }

    restsrv: string;
    imgsrv: string;
    dbsrv: string;
    mqsrv: string;
}