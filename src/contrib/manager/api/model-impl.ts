import {Base} from "../../../../src/nnt/sdk/client/dist/model";

// 从服务端传来的变量
declare let apicfg: any;

export class Model extends Base {

    constructor() {
        super();
        this.host = apicfg.host;
        this.wshost = apicfg.wshost;
    }

    requestUrl(): string {
        return "/?action=" + this.action;
    }

}
