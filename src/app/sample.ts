import {Rest} from "../nnt/server/rest";
import {IRouter} from "../nnt/core/router";

class RSample implements IRouter {
    action = "sample";
}

export class Sample extends Rest {

    constructor() {
        super();
        this.routers.register(new RSample());
    }
}