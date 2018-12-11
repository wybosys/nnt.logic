import {action, IRouter} from "../../core/router";
import {
    RmqChannels,
    RmqConnections,
    RmqConsumers, RmqDeleteNoConsumerQueues,
    RmqDeleteQueue,
    RmqExchanges,
    RmqModel, RmqPurgeQueue, RmqPurgeQueues,
    RmqQueues,
    RmqVhosts
} from "./model";
import {Transaction} from "../../server/transaction";
import {static_cast} from "../../core/core";
import {Admin} from "./admin";
import {ArrayT, IndexedObject} from "../../core/kernel";
import {Rest as RestSession} from "../../session/rest";
import {STATUS} from "../../core/models";

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

    @action(RmqDeleteQueue)
    async delqueue(trans: Transaction) {
        let m = this._pack<RmqDeleteQueue>(trans);
        await RestSession.Fetch(m);
        trans.submit();
    }

    @action(RmqPurgeQueue)
    async purgequeue(trans: Transaction) {
        let m = this._pack<RmqPurgeQueue>(trans);
        await RestSession.Fetch(m);
        trans.submit();
    }

    @action(RmqDeleteNoConsumerQueues, [], "删除没有消费者的队列")
    async delnoconsumerqueues(trans: Transaction) {
        trans.timeout(-1);
        let m: RmqDeleteNoConsumerQueues = trans.model;
        try {
            let pat = new RegExp(m.pattern);

            // 获得所有的队列
            let queues = this._pack(trans, new RmqQueues());
            queues.vhost = m.vhost;
            await RestSession.Fetch(queues);

            // 遍历符合规则的queues，并删除
            let del = this._pack(trans, new RmqDeleteQueue());
            del.vhost = m.vhost;

            for (let i = 0, l = queues.result.length; i < l; ++i) {
                let q = queues.result[i];
                if (q.consumers == 0 && q.name.match(pat)) {
                    del.name = q.name;
                    await RestSession.Get(del);
                    ++m.deleted;
                }
            }

        } catch (err) {
            trans.status = STATUS.EXCEPTION;
            trans.message = err.message;
        }
        trans.submit();
    }

    @action(RmqPurgeQueues, [], "清空队列中没有发出去的消息")
    async purgequeues(trans: Transaction) {
        trans.timeout(-1);
        let m: RmqPurgeQueues = trans.model;
        try {
            let pat = new RegExp(m.pattern);

            // 获得所有的队列
            let queues = this._pack(trans, new RmqQueues());
            queues.vhost = m.vhost;
            await RestSession.Fetch(queues);

            // 遍历符合规则的queues，并删除
            let del = this._pack(trans, new RmqPurgeQueue());
            del.vhost = m.vhost;

            for (let i = 0, l = queues.result.length; i < l; ++i) {
                let q = queues.result[i];
                if (q.consumers == 0 && q.name.match(pat)) {
                    del.name = q.name;
                    await RestSession.Get(del);
                    ++m.purged;
                }
            }

        } catch (err) {
            trans.status = STATUS.EXCEPTION;
            trans.message = err.message;
        }
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
    protected _pack<T extends RmqModel>(trans: Transaction, mdl?: T): T {
        trans.timeout(-1);
        let m: T = mdl ? mdl : trans.model;
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
