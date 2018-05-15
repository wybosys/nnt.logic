import {IRouter} from "../core/router";
import {logger} from "../core/logger";
import {Transaction} from "./transaction";
import {STATUS} from "../core/models";
import {MapT} from "../core/kernel";
import {Config} from "../manager/config";
import {KvRedis} from "../store/kvredis";
import {Find} from "../manager/dbmss";
import {KEY_PERMISSIONID, KEY_SKIPPERMISSION, Permissions} from "./devops/permissions";

export interface IRouterable {
    routers: Routers;
}

export class Routers {

    protected _routers = new Map<string, IRouter>();

    get length(): number {
        return this._routers.size;
    }

    register(obj: IRouter) {
        if (this._routers.get(obj.action)) {
            logger.fatal("已经注册了一个同名的路由{{=it.action}}", {action: obj.action});
            return;
        }
        this._routers.set(obj.action, obj);
    }

    find(id: string): IRouter {
        return this._routers.get(id);
    }

    unregister(act: string) {
        this._routers.delete(act);
    }

    forEach(proc: (v: IRouter, k: string) => void) {
        this._routers.forEach(proc);
    }

    toArray(): IRouter[] {
        return MapT.Values(this._routers);
    }

    async process(trans: Transaction) {
        let ac = trans.ace;

        // 检查devops
        if (!await this.devopscheck(trans)) {
            trans.status = STATUS.PERMISSIO_FAILED;
            trans.submit();
            return;
        }

        // 查找router
        let r = this._routers.get(trans.router);
        if (r == null) {
            trans.status = STATUS.ROUTER_NOT_FOUND;
            trans.submit();
            return;
        }

        // 模型化
        let sta = trans.modelize(r);
        if (sta) {
            trans.status = sta;
            trans.submit();
            return;
        }

        // 恢复数据上下文
        await trans.collect();

        // 请求锁，实现流控的目的
        if (trans.frqctl && !await trans.lock()) {
            trans.status = STATUS.HFDENY;
            trans.submit();
            return;
        }

        // 检查是否需要验证
        if (ac && ac.ignore) {
            // 不做权限判断
        }
        else {
            if (trans.needAuth() && !trans.auth()) {
                trans.status = STATUS.NEED_AUTH;
                trans.submit();
                return;
            }
        }

        let func = (<any>r)[trans.call];
        if (!func) {
            trans.status = STATUS.ACTION_NOT_FOUND;
            trans.submit();
            return;
        }

        // 不论同步或者异步模式，默认认为是成功的，业务逻辑如果出错则再次设置status为对应的错误码
        trans.status = STATUS.OK;
        func.call(r, trans);
        if (trans.status == STATUS.OK && trans.async()) {
            // 异步模式下，需要先respond，计算的结果再通过其他渠道返回给客户端
            trans.status = STATUS.DELAY_RESPOND;
            trans.submit();
        }
    }

    async listen(trans: Transaction) {
        if (!await this.devopscheck(trans)) {
            trans.status = STATUS.PERMISSIO_FAILED;
            trans.submit();
            return;
        }

        trans.timeout(-1);

        // 查找router
        let r = this._routers.get(trans.router);
        if (r == null) {
            trans.status = STATUS.ROUTER_NOT_FOUND;
            trans.submit();
            return;
        }

        // 模型化
        let sta = trans.modelize(r);
        if (sta) {
            trans.status = sta;
            trans.submit();
            return;
        }

        trans.status = STATUS.OK;
    }

    async unlisten(trans: Transaction) {
        if (!await this.devopscheck(trans)) {
            trans.status = STATUS.PERMISSIO_FAILED;
            trans.submit();
            return;
        }

        trans.timeout(-1);

        // 查找router
        let r = this._routers.get(trans.router);
        if (r == null) {
            trans.status = STATUS.ROUTER_NOT_FOUND;
            trans.submit();
            return;
        }

        // 模型化
        let sta = trans.modelize(r);
        if (sta) {
            trans.status = sta;
            trans.submit();
            return;
        }

        trans.status = STATUS.OK;
    }

    // devops下的权限判断
    protected async devopscheck(trans: Transaction): Promise<boolean> {
        // devops环境下才进行权限判定
        if (Config.LOCAL)
            return true;
        // 允许客户端访的将无法进行服务端权限判定
        if (Config.CLIENT_ALLOW)
            return true;
        // 和php等一样的规则
        if (Config.DEVOPS_DEVELOP) {
            let skip = trans.params[KEY_SKIPPERMISSION];
            if (skip)
                return true;
        }
        let permid = trans.params[KEY_PERMISSIONID];
        let cfg = await Permissions.locate(permid);
        return cfg != null;
    }
}
