import {template} from "./kernel";

export module logger {

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
