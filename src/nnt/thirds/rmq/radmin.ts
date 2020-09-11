import {action, IRouter} from "../../core/router";
import {
    RmqChannels,
    RmqConnections,
    RmqConsumers,
    RmqDeleteNoConsumerQueues,
    RmqDeleteQueue,
    RmqExchanges,
    RmqFindQueue,
    RmqModel,
    RmqPurgeQueue,
    RmqPurgeQueues,
    RmqQueues,
    RmqVhosts
} from "./model";
import {Transaction} from "../../server/transaction";
import {static_cast} from "../../core/core";
import {Admin} from "./admin";
import {IndexedObject, use} from "../../core/kernel";
import {Rest as RestSession} from "../../session/rest";
import {STATUS} from "../../core/models";
import {Authorization} from "../../session/model";

interface AdminConfig {
    host: string;
    user: string;
    port: number;
    password: string;
}

export class RAdmin implements IRouter {
    action = "rmqadmin";

    @action(RmqFindQueue)
    async queue(trans: Transaction) {
        let m = this._pack<RmqFindQueue>(trans);
        await RestSession.Fetch(m);
        trans.submit();
    }

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
            if (m.pattern) {
                let pat = new RegExp(m.pattern);

                // 获得所有的队列
                let queues = this._pack(trans, new RmqQueues());
                queues.vhost = m.vhost;
                queues.filter = m.pattern;
                queues.regex_filter = true;

                // 分页处理数据
                queues.page = 1;
                queues.page_count = 999;
                while (queues.page <= queues.page_count) {
                    await RestSession.Fetch(queues);

                    // 遍历符合规则的queues，并删除
                    let del = this._pack(trans, new RmqDeleteQueue());
                    del.vhost = m.vhost;

                    for (let i = 0, l = queues.result.length; i < l; ++i) {
                        let q = queues.result[i];
                        if (q.consumers == 0 && q.name.match(pat)) {
                            del.name = q.name;
                            if (await RestSession.Get(del))
                                ++m.deleted;
                        }
                    }

                    // 下一页
                    queues.page += 1;
                }
            } else if (m.prefix) {
                if (m.from == null) {
                    // 获得所有的队列
                    let queues = this._pack(trans, new RmqQueues());
                    queues.vhost = m.vhost;
                    queues.filter = m.prefix;

                    // 分页处理数据
                    queues.page = 1;
                    queues.page_count = 999;
                    while (queues.page <= queues.page_count) {
                        await RestSession.Fetch(queues);

                        // 遍历符合规则的queues，并删除
                        let del = this._pack(trans, new RmqDeleteQueue());
                        del.vhost = m.vhost;

                        for (let i = 0, l = queues.result.length; i < l; ++i) {
                            let q = queues.result[i];
                            if (q.consumers == 0 && q.name.indexOf(m.prefix) == 0) {
                                del.name = q.name;
                                if (await RestSession.Get(del))
                                    ++m.deleted;
                            }
                        }

                        // 下一页
                        queues.page += 1;
                    }
                } else {
                    let del = this._pack(trans, new RmqDeleteQueue());
                    del.vhost = m.vhost;

                    // 获取目标queue的信息
                    let query = this._pack(trans, new RmqFindQueue());
                    query.vhost = m.vhost;

                    for (let i = 0; i < m.length; ++i) {
                        // 只清除特定的queue
                        query.name = del.name = m.prefix + (m.from + i);
                        if (await RestSession.Get(query)) {
                            if (query.result.consumers == 0) {
                                if (await RestSession.Get(del))
                                    ++m.deleted;
                            }
                        }
                    }
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
            if (m.pattern) {
                let pat = new RegExp(m.pattern);

                // 获得所有的队列
                let queues = this._pack(trans, new RmqQueues());
                queues.vhost = m.vhost;
                queues.filter = m.pattern;
                queues.regex_filter = true;

                // 分页处理数据
                queues.page = 1;
                queues.page_count = 999;
                while (queues.page <= queues.page_count) {
                    await RestSession.Fetch(queues);

                    // 遍历符合规则的queues，并删除
                    let purge = this._pack(trans, new RmqPurgeQueue());
                    purge.vhost = m.vhost;

                    for (let i = 0, l = queues.result.length; i < l; ++i) {
                        let q = queues.result[i];
                        if (q.name.match(pat)) {
                            purge.name = q.name;
                            if (await RestSession.Get(purge))
                                ++m.purged;
                        }
                    }

                    // 下一页
                    queues.page += 1;
                }
            } else if (m.prefix) {
                if (m.from == null) {
                    // 获得所有的队列
                    let queues = this._pack(trans, new RmqQueues());
                    queues.vhost = m.vhost;
                    queues.filter = m.prefix;

                    // 分页处理数据
                    queues.page = 1;
                    queues.page_count = 999;
                    while (queues.page <= queues.page_count) {
                        await RestSession.Fetch(queues);

                        // 遍历符合规则的queues，并删除
                        let purge = this._pack(trans, new RmqPurgeQueue());
                        purge.vhost = m.vhost;

                        for (let i = 0, l = queues.result.length; i < l; ++i) {
                            let q = queues.result[i];
                            if (q.name.indexOf(m.prefix) == 0) {
                                purge.name = q.name;
                                if (await RestSession.Get(purge))
                                    ++m.purged;
                            }
                        }

                        // 下一页
                        queues.page += 1;
                    }
                } else {
                    // 遍历符合规则的queues，并删除
                    let purge = this._pack(trans, new RmqPurgeQueue());
                    purge.vhost = m.vhost;

                    // 不需要判断存在与否，直接purge
                    for (let i = 0; i < m.length; ++i) {
                        purge.name = m.prefix + (m.from + i);
                        if (await RestSession.Get(purge))
                            ++m.purged;
                    }
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
            m.authorization = use(new Authorization(), au => {
                au.user = srv.user;
                au.passwd = srv.password;
            });
        } else {
            m.host = 'http://' + this.host + ':' + this.port + '/api';
            m.authorization = use(new Authorization(), au => {
                au.user = this.user;
                au.passwd = this.password;
            });
        }
        return m;
    }
}
