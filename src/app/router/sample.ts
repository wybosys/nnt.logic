import {action, IRouter} from "../../nnt/core/router";
import {Transaction} from "../../nnt/server/transaction";
import {DateTime} from "../../nnt/core/time";
import {TODAY_RANGE} from "../../nnt/component/today";
import {Echoo} from "../model/sample";

export class RSample implements IRouter {
    action = "sample";

    @action(Echoo)
    echo(trans: Transaction) {
        let m: Echoo = trans.model;
        m.output = m.input;
        m.time = DateTime.Now();
        m.today = TODAY_RANGE;
        trans.submit();
    }
}
