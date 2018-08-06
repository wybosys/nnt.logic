import cron = require("cron");
import {logger} from "../core/logger";
import {GetObjectClassName} from "../core/core";
import {Clusters} from "./clusters";

export abstract class CronTask {

    // 任务id
    id: string;

    // 执行依赖的时间
    time: string;

    // 主执行函数
    abstract main(): void;

    // 启动
    start(cluster: boolean = false): boolean {
        this._keeprunning = true;

        if (!cluster) {
            if (this._doStart()) {
                tasks.add(this);
                return true;
            }
            return false;
        }

        // 只有集群中的主服务可以添加任务
        if (Clusters.IsMaster) {
            if (this._doStart()) {
                mastertasks.add(this);
                return true;
            }
            return false;
        }

        // 不是集群，所以不能运行（等待自己被推举成master时再启动)
        mastertasks.add(this);
        return true;
    }

    // 停止
    stop() {
        if (!this._job)
            return;

        this._keeprunning = false;
        this._job.stop();
        this._job = null;

        tasks.delete(this);
        mastertasks.delete(this);
    }

    // 是否位于计划任务中
    get croning(): boolean {
        return this._job && this._job.running;
    }

    private _job: cron.CronJob;
    private _keeprunning: boolean; // 保持运行状态，避免自动结束

    private _doStart(): boolean {
        let tm = cron.time(this.time);
        if (!tm) {
            logger.warn("设置了错误的cron时间 {{=it.time}}", this);
            return false;
        }

        this._job = new cron.CronJob(this.time, () => {
            logger.log("执行一次计划任务 {{=it.name}}", {name: GetObjectClassName(this)});

            // 执行一次
            this.main();
        }, () => {

            // 保护运行状态
            if (this._keeprunning) {
                // 重新启动
                logger.log("自动重新启动计划任务 {{=it.name}}", {name: GetObjectClassName(this)});
                this._doStart();
            }
        }, true, 'Asia/Shanghai');

        return true;
    }
}

// 普通任务
let tasks = new Set<CronTask>();

// 集群任务
let mastertasks = new Set<CronTask>();

Clusters.OnBecomeMaster(() => {
    mastertasks.forEach(e => {
        e.start(true);
    });
});

Clusters.OnBecomeSlaver(() => {
    // 停掉所有的集群任务
    mastertasks.forEach(e => {
        e.stop();
    });
});

// 生成配置
export function PerSecond(v: number = 1): string {
    return "*/" + v + " * * * * *";
}

export function PerMinute(v: number = 1): string {
    return "00 */" + v + " * * * *";
}

export function PerHour(v: number = 1): string {
    return "00 00 */" + v + " * * *";
}

export function PerDay(v: number = 1): string {
    return "00 00 00 */" + v + " * *";
}