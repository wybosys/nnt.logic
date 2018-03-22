import {AbstractLogger} from "./logger"
import {Config} from "../manager/config";

export class Console extends AbstractLogger {

    log(msg: string) {
        if (Config.DEVELOP || Config.DEBUG)
            console.log(msg);
    }

    warn(msg: string) {
        console.warn(msg);
    }

    info(msg: string) {
        console.info(msg);
    }

    fatal(msg: string) {
        console.error(msg);
    }

    exception(msg: any) {
        console.error(msg);
    }

}
