import {Node} from "../config/config"
import {ObjectExt} from "../core/object";
import {AcEntity} from "../acl/acl";
import {IndexedObject} from "../core/kernel";

export abstract class AbstractServer extends ObjectExt {

    // 服务器的配置id
    id: string;

    // 配置服务
    config(cfg: Node): boolean {
        if (!cfg.id)
            return false;
        this.id = cfg.id;
        return true;
    }

    // 启动服务
    abstract start(): Promise<void>;

    // 停止服务
    abstract stop(): Promise<void>;

    // 回调
    protected onStart() {
    }

    protected onStop() {
    }
}

// 如果需要在业务中的api调用某一个服务(使用Servers.Call函数)则目标server必须实现此接口
export interface IConsoleServer {

    // 通过控制台执行
    // @params 调用参数
    // @req 请求对象
    // @rsp 响应对象
    // @ac 特殊权限
    invoke(params: IndexedObject, req: any, rsp: any, ac?: AcEntity): void;

}