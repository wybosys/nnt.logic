import {Rest} from "../nnt/server/rest";
import {RSample} from "./router/sample";

export class SampleRest extends Rest {

    constructor() {
        super();
        this.routers.register(new RSample());
    }
}
