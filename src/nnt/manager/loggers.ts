import {AbstractLogger, Filter, LoggerNode} from "../logger/logger"
import {Node, NodeIsEnable} from "../config/config"
import {logger} from "../core/logger"
import {App} from "./app";
import {SyncArray, template} from "../core/kernel";
import {Config} from "./config";

let loggers = new Array<AbstractLogger>();

enum TYPE {
    LOG,
    WARN,
    INFO,
    FATAL,
    EXCEPTION
};

function output(msg: string, filter: string, typ: TYPE) {
    loggers.forEach(e => {
        if (e.isAllow(filter)) {
            if (typ == TYPE.LOG)
                e.log(msg);
            else if (typ == TYPE.INFO)
                e.info(msg);
            else if (typ == TYPE.WARN)
                e.warn(msg);
            else if (typ == TYPE.EXCEPTION)
                e.exception(msg);
            else
                e.fatal(msg);
        }
    });
}

logger.log = (fmt: string, params: any) => {
    let msg = template(fmt, params);
    if (loggers.length)
        output(msg, Filter.LOG, TYPE.LOG);
    else
        console.log(msg);
}

logger.warn = (fmt: string, params: any) => {
    let msg = template(fmt, params);
    if (loggers.length)
        output(msg, Filter.WARN, TYPE.WARN);
    else
        console.warn(msg);
}

logger.info = (fmt: string, params: any) => {
    let msg = template(fmt, params);
    if (loggers.length)
        output(msg, Filter.INFO, TYPE.INFO);
    else
        console.info(msg);
}

logger.fatal = (fmt: string, params: any) => {
    let msg = template(fmt, params);
    if (loggers.length)
        output(msg, Filter.FATAL, TYPE.FATAL);
    else
        console.error(msg);
}

logger.exception = (exc) => {
    if (loggers.length)
        output(exc, Filter.EXCEPTION, TYPE.EXCEPTION);
    else
        console.warn(exc);
}

export async function Start(cfg: Node[]): Promise<void> {
    if (cfg.length) {
        await SyncArray(cfg).forEach(async e => {
            if (!NodeIsEnable(e))
                return;
            if (!e.entry)
                return;

            let t: AbstractLogger = App.shared().instanceEntry(e.entry);
            if (!t)
                return;

            try {
                t.config(e);
                console.log("输出log至 " + e.id);
            }
            catch (err) {
                console.error(err);
            }
            finally {
                loggers.push(t);
            }
        });

        // 额外如果位于devops环境中，需要自动初始化devops的日志
        if (Config.DEVELOP) {
            let t: AbstractLogger = App.shared().instanceEntry("nnt.logger.Log4devops");
            t.config(<LoggerNode>{
                id: "devops-logs",
                filter: "all"
            });
            loggers.push(t);
        }
    }
    else {
        await Stop();
    }
}

export async function Stop(): Promise<void> {
    loggers.length = 0;
}
