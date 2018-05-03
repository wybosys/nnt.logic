import {template} from "./kernel";

export module logger {

    export enum Level {
        SPECIAL = 9,
        CUSTOM = 8,
        DEBUG = 7,
        INFO = 6,
        NOTICE = 5,
        WARNING = 4,
        ERROR = 3,
        ALERT = 2,
        CRITICAL = 1,
        EMERGENCE = 0,
        EMERGENCY = 0
    }

    // 采用doT模板
    export let log: (fmt: string, params?: any) => void = (fmt: string, params: any) => {
        let msg = template(fmt, params);
        console.log(msg);
    }

    export let warn: (fmt: string, params?: any) => void = (fmt: string, params: any) => {
        let msg = template(fmt, params);
        console.warn(msg);
    }

    export let info: (fmt: string, params?: any) => void = (fmt: string, params: any) => {
        let msg = template(fmt, params);
        console.info(msg);
    }

    export let fatal: (fmt: string, params?: any) => void = (fmt: string, params: any) => {
        let msg = template(fmt, params);
        console.error(msg);
    }

    export let exception: (exc: any) => void = (exc: any) => {
        console.error(exc);
    }

    export function error(err: Error) {
        warn(err.message + "\n" + err.stack);
    }

    export function assert(v: any, fmt: string, params?: any) {
        if (!v) {
            logger.fatal(fmt, params);
        }
    }
}
