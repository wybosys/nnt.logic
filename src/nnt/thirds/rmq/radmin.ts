import {action, IRouter} from "../../core/router";
import {RmqChannels, RmqConnections, RmqConsumers, RmqExchanges, RmqModel, RmqQueues, RmqVhosts} from "./model";
import {Transaction} from "../../server/transaction";
import {static_cast} from "../../core/core";
import {Admin} from "./admin";
import {IndexedObject} from "../../core/kernel";
import {Rest as RestSession} from "../../session/rest";

interface AdminConfig {
    host: string;
    user: string;
    port: number;
    password: string;
}

export class RAdmin implements IRouter {
    action = "rmqadmin";

    @action(RmqVhosts)
    async vhosts(trans: Transaction) {
        let m = this._pack<RmqVhosts>(trans);
        await RestSession.Fetch(m);
        trans.submit();
    }

    @action(RmqConnections)
    async connections(trans: Transaction) {
        let m = this._pack<RmqConnections>(trans);
        await RestSession.Fetch(m);
        trans.submit();
    }

    @action(RmqChannels)
    async channels(trans: Transaction) {
        let m = this._pack<RmqChannels>(trans);
        await RestSession.Fetch(m);
        trans.submit();
    }

    @action(RmqQueues)
    async queues(trans: Transaction) {
        let m = this._pack<RmqQueues>(trans);
        await RestSession.Fetch(m);
        trans.submit();
    }

    @action(RmqConsumers)
    async consumers(trans: Transaction) {
        let m = this._pack<RmqConsumers>(trans);
        await RestSession.Fetch(m);
        trans.submit();
    }

    @action(RmqExchanges)
    async exchanges(trans: Transaction) {
        let m = this._pack<RmqExchanges>(trans);
        await RestSession.Fetch(m);
        trans.submit();
    }

    // 独立配置
    config(cfg: IndexedObject): boolean {
        let c = static_cast<AdminConfig>(cfg);
        if (!c.host)
            return false;
        let arr = c.host.split(":");
        this.host = arr[0];
        this.port = arr.length == 2 ? parseInt(arr[1]) : 15672;
        this.user = c.user;
        this.password = c.password;
        return true;
    }

    host: string;
    port: number;
    user: string;
    password: string;

    // 填充模型基础数据
    protected _pack<T extends RmqModel>(trans: Transaction): T {
        trans.timeout(-1);
        let m: T = trans.model;
        if (trans.server instanceof Admin) {
            let srv = static_cast<Admin>(trans.server);
            m.host = 'http://' + srv.host + ':' + srv.port + '/api';
            m.user = srv.user;
            m.passwd = srv.password;
        } else {
            m.host = 'http://' + this.host + ':' + this.port + '/api';
            m.user = this.user;
            m.passwd = this.password;
        }
        return m;
    }
}
