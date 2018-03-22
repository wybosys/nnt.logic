import {action, IRouter} from "../../core/router";
import {Transaction} from "../transaction";
import {RestUpdate, STATUS} from "../../core/models";
import {ProcessListener} from "./listener";
import {MapT} from "../../core/kernel";

const WEAK_HEARTBEAT = 30;

// RestService用来解决如下问题
// 1，当model是异步连接模式时，客户端请求会被立即返回。当服务端逻辑运行结束后，得到的结果将缓存在服务器中，等待客户端使用提供的SDK刷新此接口，或者当客户端请求其他同步接口时返回
// 2，和ClientSDK配合，维持一个弱心跳(每一次心跳的间隔时间通过服务端返回，这样可以通过对api请求的分析计算最优的心跳间隔)，该数据通道用来使用rest来模仿socket

export class RestService implements IRouter {
    action = "rest";

    @action(RestUpdate)
    update(trans: Transaction) {
        let m: RestUpdate = trans.model;

        // 弱心跳的时间
        m.heartbeatTime = WEAK_HEARTBEAT;

        // 处理监听
        ProcessListener(trans.sessionId(), trans.clientId(), null, result => {
            if (!result) {
                // 代表没有查找到监听，需要通知客户端重新监听
                trans.status = STATUS.REST_NEED_RELISTEN;
                trans.submit();
                return;
            }

            m.models = MapT.Values(result, t => {
                return t.model;
            });

            trans.submit();
        });
    }
}
