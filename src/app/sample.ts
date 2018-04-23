import {Rest} from "../nnt/server/rest";
import {action, IRouter} from "../nnt/core/router";
import {input, model, output, string} from "../nnt/core/proto";
import {Transaction} from "../nnt/server/transaction";

@model()
export class Echoo {

    @string(1, [input], "输入")
    input: string;

    @string(2, [output], "输出")
    output: string;
}

export class RSample implements IRouter {
    action = "sample";

    @action(Echoo)
    echo(trans: Transaction) {
        let m: Echoo = trans.model;
        m.output = m.input;
        trans.submit();
    }
}

export class Sample extends Rest {

    constructor() {
        super();
        this.routers.register(new RSample());
    }
}