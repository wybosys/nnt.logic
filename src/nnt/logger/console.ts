import {AbstractLogger} from "./logger"
import {Config} from "../manager/config";
import {SStatus} from "../core/models";

export class Console extends AbstractLogger {

    log(msg: string, status?: SStatus) {
        if (Config.DEVELOP || Config.DEBUG)
            console.log(msg);
    }

    warn(msg: string, status?: SStatus) {
        console.warn(msg);
    }

    info(msg: string, status?: SStatus) {
        console.info(msg);
    }

    fatal(msg: string, status?: SStatus) {
        console.error(msg);
    }

    exception(msg: any, status?: SStatus) {
        console.error(msg);
    }

}
