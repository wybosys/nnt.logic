import {AbstractLogger} from "./logger";
import {Node} from "../config/config";
import {SStatus, STATUS} from "../core/models";
import {toJson} from "../core/json";
import {DateTime} from "../core/time";
import redis = require("redis");
import os = require("os");

const SPECIAL = 9;
const CUSTOM = 8;
const DEBUG = 7;
const INFO = 6;
const NOTICE = 5;
const WARNING = 4;
const ERROR = 3;
const ALERT = 2;
const CRITICAL = 1;
const EMERGENCE = 0;
const EMERGENCY = 0;

// 当运行于devops环境中，需要按照统一的规则保存日志
export class Log4devops extends AbstractLogger {

    constructor() {
        super();
        let hdl = redis.createClient({
            host: "logs",
            port: 6379
        });
        hdl.on('error', err => {
            console.warn("devops日志服务数据库遇到错误");
            console.error(err);
            this._hdl = null;
        });
        hdl.on('ready', () => {
            this._hdl = hdl;
            console.log("连接 devops-logs@redis");
        });
    }

    private _hdl: redis.RedisClient;
    protected _key = os.hostname();

    config(cfg: Node) {
        return super.config(cfg);
    }

    log(msg: string, status?: SStatus) {
        this.output(DEBUG, msg, status);
    }

    warn(msg: string, status?: SStatus) {
        this.output(WARNING, msg, status);
    }

    info(msg: string, status?: SStatus) {
        this.output(INFO, msg, status);
    }

    fatal(msg: string, status?: SStatus) {
        this.output(CRITICAL, msg, status);
    }

    exception(msg: any, status?: SStatus) {
        this.output(EMERGENCE, msg.toString(), status);
    }

    protected output(level: number, msg: string, status: SStatus) {
        if (this._hdl) {
            this._hdl.select(level, () => {
                let data = {
                    t: DateTime.Current(),
                    c: status == null ? STATUS.OK : status,
                    m: msg
                };
                this._hdl.lpush(this._key, toJson(data));
            });
        }
    }
}