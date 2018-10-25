import {Base} from "../../nnt/session/model";
import {Find} from "../../nnt/manager/servers";
import {Logic} from "../../nnt/server/logic";
import {Hook, STARTED} from "../../nnt/manager/app";
import {Config} from "../../nnt/manager/config";

export class Model extends Base {

    constructor() {
        super();
        this.host = Model.HOST;
    }

    domain: string;

    requestUrl(): string {
        if (Config.LOCAL)
            return this.host + "?action=" + this.action;
        return this.host + this.domain + "/?action=" + this.action;
    }

    static HOST: string;
}

// 读取logic的配置
Hook(STARTED, () => {
    let logic = <Logic>Find("logic");
    Model.HOST = logic.host;
});
