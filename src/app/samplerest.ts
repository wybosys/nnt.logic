import {Rest} from "../nnt/server/rest";
import {Trans} from "./model/trans";
import {RIm} from "./router/im";

export class SampleRest extends Rest {

    constructor() {
        super();
        // this.routers.register(new RSample());
        this.routers.register(new RIm());
    }

    instanceTransaction(): Trans {
        return new Trans();
    }
}
