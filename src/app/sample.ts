import {Rest} from "../nnt/server/rest";
import {action, IRouter} from "../nnt/core/router";
import {input, integer, model, output, string} from "../nnt/core/proto";
import {Transaction} from "../nnt/server/transaction";
import {DateTime} from "../nnt/core/time";

@model()
export class Echoo {

    @string(1, [input], "输入")
    input: string;

    @string(2, [output], "输出")
    output: string;

    @integer(3, [output], "服务器时间")
    time: number;
}

export class RSample implements IRouter {
    action = "sample";

    @action(Echoo)
    echo(trans: Transaction) {
        let m: Echoo = trans.model;
        m.output = m.input;
        m.time = DateTime.Now();
        trans.submit();
    }
}

export class Sample extends Rest {

    constructor() {
        super();
        this.routers.register(new RSample());
    }
}