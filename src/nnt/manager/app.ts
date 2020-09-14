import fs = require("fs");
import loggers = require("./loggers");
import dbmss = require("./dbmss");
import servers = require("./servers");
import containers = require("./containers");
import events = require("events");
import {AppNodes, DevopsNode} from "../config/app";
import {sep} from "path";
import {assets} from "./assets";
import {expand, home, pathd, RegisterScheme} from "../core/url";
import {logger} from "../core/logger";
import {Config, IsDebug, IsDevops, IsDevopsDevelop, IsDevopsRelease, IsLocal} from "./config";
import {unsafeUuid} from "../core/random";
import {toJsonObject} from "../core/json";
import {ArrayT} from "../core/arrayt";

export class App {

    signals = new events.EventEmitter();

    static EVENT_START = "::app::start";
    static EVENT_STOP = "::app:stop";

    constructor() {
        App._shared = this;

        // 调用注册的全局事件
        RunHooks(BOOT);
    }

    // 加载程序配置
    static LoadConfig(appcfg: string = "~/app.json", devcfg: string = "~/devops.json"): AppNodes {
        appcfg = expand(appcfg);
        if (devcfg)
            devcfg = expand(devcfg);

        // 读取配置信息
        if (!fs.existsSync(appcfg)) {
            console.error("读取配置文件失败");
            return null;
        }

        if (devcfg && !fs.existsSync(devcfg)) {
            console.error("读取DEVOPS配置文件失败");
            return null;
        }

        // 通过配置文件来启动服务端
        let cfg: AppNodes = toJsonObject(fs.readFileSync(appcfg, "utf8"));

        // 处理输入参数
        let argv = process.argv;

        // 判断是否直接执行指定服务
        let directserveridx = argv.indexOf('--server');
        if (directserveridx != -1) {
            let directserver = argv[directserveridx + 1];
            // 运行制定的server
            if (cfg.server) {
                // 查找制定id的server
                cfg.server = ArrayT.QueryObjects(cfg.server, e => {
                    return e.id == directserver;
                });
            }
            // 其他配置清空
            cfg.container = [];
            cfg.dbms = [];
        }

        if ((Config.DEBUG = argv.indexOf("--debug") != -1))
            logger.log("debug模式启动");
        else if ((Config.DEVELOP = argv.indexOf("--develop") != -1))
            logger.log("develop模式启动");
        else if ((Config.PUBLISH = argv.indexOf("--publish") != -1))
            logger.log("publish模式启动");
        if ((Config.DISTRIBUTION = !IsDebug()))
            logger.log("distribution模式启动");
        if ((Config.LOCAL = IsLocal()))
            logger.info("LOCAL 环境");
        if ((Config.DEVOPS = IsDevops()))
            logger.info("DEVOPS 环境");
        if ((Config.DEVOPS_DEVELOP = IsDevopsDevelop()))
            logger.info("DEVOPS DEVELOP 环境");
        if ((Config.DEVOPS_RELEASE = IsDevopsRelease()))
            logger.info("DEVOPS RELEASE 环境");
        Config.FORCE_MASTER = argv.indexOf("--master") != -1;
        Config.FORCE_SLAVER = argv.indexOf("--slaver") != -1;

        // 设置为当前参数
        App.CurrentConfig = cfg;

        // 读取系统配置
        let c = cfg.config;
        if (c.sidexpire)
            Config.SID_EXPIRE = c.sidexpire;
        if (c.cidexpire)
            Config.CID_EXPIRE = c.cidexpire;
        if (c.cache)
            Config.CACHE = expand(c.cache);
        if (c.https)
            Config.HTTPS = c.https;
        if (c.http2)
            Config.HTTP2 = c.http2;
        if (c.httpskey)
            Config.HTTPS_KEY = c.httpskey;
        if (c.httpscert)
            Config.HTTPS_CERT = c.httpscert;
        if (c.httpspfx)
            Config.HTTPS_PFX = c.httpspfx;
        if (c.httpspasswd)
            Config.HTTPS_PASSWD = c.httpspasswd;
        if (c.deskey)
            Config.DES_KEY = c.deskey;
        if (c.cluster != null) {
            Config.CLUSTER = true;
            if (c.cluster === true)
                Config.CLUSTER_PARALLEL = -1;
            else
                Config.CLUSTER_PARALLEL = c.cluster;
        }

        // 读取devops的配置
        if (devcfg) {
            let cfg: DevopsNode = toJsonObject(fs.readFileSync(devcfg, "utf8"));
            if (cfg.client != null)
                Config.CLIENT_ALLOW = cfg.client;
            if (cfg.server != null)
                Config.SERVER_ALLOW = cfg.server;
            if (cfg.allow != null)
                Config.ACCESS_ALLOW = cfg.allow;
            if (cfg.deny != null)
                Config.ACCESS_DENY = cfg.deny;
        }

        if (!fs.existsSync(Config.CACHE))
            fs.mkdirSync(Config.CACHE);

        return cfg;
    }

    // 当前配置信息
    static CurrentConfig: AppNodes;

    private static _shared: App;

    static shared(): App {
        return this._shared;
    }

    @pathd() // entry位于的目录
    entryDir: string;

    @pathd() // 资源目录
    assetDir: string;

    // 启动
    async start() {
        // 设置资源管理器的目录
        assets.directory = this.assetDir;

        let cfg = App.CurrentConfig;
        if (cfg.logger)
            await loggers.Start(cfg.logger);
        if (cfg.dbms)
            await dbmss.Start(cfg.dbms);
        if (cfg.server)
            await servers.Start(cfg.server);
        if (cfg.container)
            await containers.Start(cfg.container);

        // 启动成功
        RunHooks(STARTED);
        this.signals.emit(App.EVENT_START);
    }

    // 停止
    async stop() {
        await servers.Stop();
        await dbmss.Stop();
        await loggers.Stop();
        await containers.Stop();

        RunHooks(STOPPED);
        this.signals.emit(App.EVENT_STOP);
    }

    // 构造一个entry
    instanceEntry(entry: string): any {
        let parts = entry.split(".");
        let ph = this.entryDir + parts.join(sep).toLowerCase();
        let clsnm = parts[parts.length - 1];
        let m: any;
        try {
            m = require(ph);
        } catch (err) {
            console.warn(err.message);
        }
        if (!m)
            return null;
        let clazz = m[clsnm];
        if (!clazz)
            return null;
        return new clazz();
    }

    containsEntry(entry: string): boolean {
        let parts = entry.split(".");
        let ph = this.entryDir + parts.join(sep).toLowerCase();
        let clsnm = parts[parts.length - 1];
        let m: any;
        try {
            m = require(ph);
        } catch (err) {
            console.warn(err.message);
        }
        if (!m)
            return false;
        let clazz = m[clsnm];
        return clazz != null;
    }

    // 获得当前的唯一id(运行期)
    private _uniqueId: string;

    get uniqueId(): string {
        if (!this._uniqueId) {
            this._uniqueId = unsafeUuid(16, 16);
        }
        return this._uniqueId;
    }
}

// 程序加载时调用
export let BOOT = "boot";

// 服务器启动后调用
export let STARTED = "started";
export let STOPPED = "stopped";

// 全局钩子
let hooks = new Map<string, Array<() => void>>();

export function Hook(step: string, proc: () => void) {
    let arr = hooks.get(step);
    if (arr == null) {
        arr = new Array<() => void>();
        hooks.set(step, arr);
    }
    arr.push(proc);
}

function RunHooks(step: string) {
    let arr = hooks.get(step);
    if (arr)
        arr.forEach(proc => {
            proc();
        });
}

// 处理entry的url转换
RegisterScheme("entry", body => {
    return App.shared().entryDir + body;
});

// 处理clientSDK的url转换
RegisterScheme("sdk", body => {
    return home() + "/src/" + body;
});

RegisterScheme("cache", body => {
    return Config.CACHE + "/" + body;
});

if (!IsLocal()) {
    // 运行到本地环境之外，对未知异常进行捕获

    process.on('uncaughtException', err => {
        logger.error(err);
    })

    process.on('unhandledRejection', err => {
        logger.error(new Error(err.toString()));
    });
}