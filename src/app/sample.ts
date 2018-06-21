import {Rest} from "../nnt/server/rest";
import {action, IRouter} from "../nnt/core/router";
import {input, integer, json, model, output, string} from "../nnt/core/proto";
import {Transaction} from "../nnt/server/transaction";
import {DateTime} from "../nnt/core/time";
import {IndexedObject} from "../nnt/core/kernel";
import {TODAY_RANGE} from "../nnt/component/today";

@model()
export class Echoo {

    @string(1, [input], "输入")
    input: string;

    @string(2, [output], "输出")
    output: string;

    @integer(3, [output], "服务器时间")
    time: number;

    @json(4, [output], "当天的时间段")
    today: IndexedObject;
}

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

export class Sample extends Rest {

    constructor() {
        super();
        this.routers.register(new RSample());
    }
}