import {action, IRouter} from "../../core/router";
import {RmqModel, RmqVhosts} from "./model";
import {Transaction} from "../../server/transaction";
import {static_cast} from "../../core/core";
import {Admin} from "./admin";

export class RAdmin implements IRouter {
    action = "rmqadmin";

    @action(RmqVhosts)
    vhosts(trans: Transaction) {
        let m = this._pack<RmqVhosts>(trans.model);
        trans.submit();
    }

    // 填充模型基础数据
    protected _pack<T extends RmqModel>(trans: Transaction): T {
        let m: T = trans.model;
        m.host = 'http://';
        return m;
    }
}
