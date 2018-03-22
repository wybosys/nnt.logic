import log4js = require("log4js");
import {AbstractLogger} from "./logger";
import {Node} from "../config/config";
import {AbstractCronTask, CronAdd, PerDay} from "../manager/crons";
import {DateTime} from "../core/time";
import {Config} from "../manager/config";

interface Log4TsNode extends Node {
    // config 根据 https://nomiddlename.github.io/log4js-node/appenders.html 配置的参数集
    config: any;
}

// 每天
let TODAY = "";

// 带PID的每天
let TODAY_PID = "";

export class Log4Ts extends AbstractLogger {

    constructor() {
        super();
        // 每天需要更新一次appender需要的相关参数
        CronAdd(PerDay(1), new TaskLog4ts(this), false);
    }

    config(cfg: Node) {
        if (!super.config(cfg))
            return false;
        let c = <Log4TsNode>cfg;
        if (!c.config)
            return false;
        this.cfg = c.config;
        this.cfg.pm2 = Config.CLUSTER;
        // 配置
        log4js.configure(this.cfg);
        this._hdl = log4js.getLogger();
        this.updateProperties();
        return true;
    }

    cfg: any;
    protected _hdl: log4js.Logger;

    log(msg: string) {
        this._hdl.debug(msg);
    }

    warn(msg: string) {
        this._hdl.warn(msg);
    }

    info(msg: string) {
        this._hdl.info(msg);
    }

    fatal(msg: string) {
        this._hdl.fatal(msg);
    }

    exception(msg: any) {
        this._hdl.fatal(msg);
    }

    updateProperties() {
        if (!this._hdl)
            return;
        let today = new DateTime().toString("yyyy-MM-dd");
        this._hdl.addContext("TODAY", today);
        this._hdl.addContext("TODAY_PID", today + "#" + process.pid);
    }
}

class TaskLog4ts extends AbstractCronTask {

    constructor(hdl: Log4Ts) {
        super();
        this._hdl = hdl;
    }

    private _hdl: Log4Ts;

    main() {
        this._hdl.updateProperties();
    }
}