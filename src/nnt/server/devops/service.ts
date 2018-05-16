import {action, IRouter} from "../../core/router";
import {Transaction} from "../transaction";
import {array, output, string, string_t} from "../../core/proto";
import {ObjectT} from "../../core/kernel";
import {Config} from "../../manager/config";
import {Permissions} from "./permissions";

class Info {

    @array(1, string_t, [output])
    env: string[];

    @string(2, [output])
    configuration: string;

    @string(3, [output])
    permissionid: string;
}

export class DevopsService implements IRouter {
    action = "devops";

    @action(Info)
    info(trans: Transaction) {
        let m: Info = trans.model;

        m.env = ObjectT.Convert(process.env, (v, k) => {
            return k + ":" + v;
        });

        if (Config.LOCAL)
            m.configuration = "local";
        else if (Config.DEVOPS_DEVELOP)
            m.configuration = "devops-develop";
        else if (Config.DEVOPS_RELEASE)
            m.configuration = "devops-release";

        if (Permissions)
            m.permissionid = Permissions.id;

        trans.submit();
    }
}