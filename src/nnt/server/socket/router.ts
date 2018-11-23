import {action, IRouter} from "../../core/router";
import {AuthedNull} from "../../core/models";
import {Transaction} from "../transaction";

export class RSocket implements IRouter {
    action = "socket";

    // 初始化socket连接，通常客户端sdk会带来sid等一系列约定好的数据
    @action(AuthedNull)
    init(trans: Transaction) {
        // 不做任何处理
        trans.submit();
    }

    // socket客户端访问的心跳
    @action(AuthedNull)
    ping(trans: Transaction) {
        // 不做任何处理
        trans.submit();
    }
}
