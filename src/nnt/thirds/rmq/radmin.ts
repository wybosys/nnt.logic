import {action, IRouter} from "../../core/router";
import {RmqVhosts} from "./model";
import {Transaction} from "../../server/transaction";

export class RAdmin implements IRouter {
    action = "rmqadmin";

    @action(RmqVhosts)
    vhosts(trans: Transaction) {
        trans.submit();
    }
}
