import {Base} from "../../../../src/nnt/sdk/client/dist/model";

// 从服务端传来的变量
declare let apidoc: any;

export class Model extends Base {

    constructor() {
        super();
        this.host = apidoc.host;
        this.port = apidoc.port;
        this.wshost = apidoc.wshost;
        this.wsport = apidoc.wsport;
    }

    requestUrl(): string {
        return "/?action=" + this.action;
    }

}
