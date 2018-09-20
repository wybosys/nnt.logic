import {Rest} from "../nnt/server/rest";
import {RSample} from "./router/sample";
import {Trans} from "./model/trans";

export class SampleRest extends Rest {

    constructor() {
        super();
        this.routers.register(new RSample());
    }

    instanceTransaction(): Trans {
        return new Trans();
    }
}
