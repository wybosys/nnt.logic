import {Base} from "../../nnt/session/model";
import {Find} from "../../nnt/manager/servers";
import {Logic} from "../../nnt/server/logic";

export class Model extends Base {

    domain: string;

    requestUrl(): string {
        return "";
    }

    static HOST: string;
}

// 读取logic的配置
let logic = <Logic>Find("logic");
Model.HOST = logic.host;
