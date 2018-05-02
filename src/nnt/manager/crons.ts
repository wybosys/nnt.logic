import cron = require("cron");
import {logger} from "../core/logger";
import {GetObjectClassName} from "../core/core";
import {Clusters} from "./clusters";
import {ArrayT} from "../core/kernel";

export abstract class AbstractCronTask {

    // 主执行函数
    abstract main(): void;

    // 停止
    stopped() {
    }

    // 是否位于计划任务中
    get croning(): boolean {
        return this._job && this._job.running;
    }

    private _job: cron.CronJob;
}

interface TaskRecord {
    id: string;
    time: string;
    task: AbstractCronTask;
    job?: cron.CronJob;
}

// 普通任务
let tasks = new Array<TaskRecord>();

// 集群任务
let mastertasks = new Array<TaskRecord>();

// 没有跑起来的集群任务
let masteralltasks = new Array<TaskRecord>();

// 添加任务
// clusters 在集群中添加任务，会保证集群中只有一个运行
export function CronAdd(time: string, task: AbstractCronTask, clusters: boolean, id?: string): TaskRecord {
    if (!clusters) {
        let rcd = doCronAdd(time, task, id);
        if (rcd) {
            tasks.push(rcd);
            return rcd;
        }
        return null;
    }

    // 只有集群中的主服务可以添加任务
    if (Clusters.IsMaster) {
        let rcd = doCronAdd(time, task);
        if (rcd) {
            mastertasks.push(rcd);
            masteralltasks.push({
                id: id,
                time: time,
                task: task
            });
            return rcd;
        }
        return null;
    }

    let rcd = {
        id: id,
        time: time,
        task: task
    };
    masteralltasks.push(rcd);
    return rcd;
}

// 删除任务
export function CronRemove(rcd: TaskRecord) {
    // 停止任务
    if (rcd.job)
        rcd.job.stop();
    // 从集合中移除
    ArrayT.RemoveObject(tasks, rcd);
    ArrayT.RemoveObject(mastertasks, rcd);
    ArrayT.RemoveObject(masteralltasks, rcd);
}

Clusters.OnBecomeMaster(() => {
    masteralltasks.forEach(e => {
        let rcd = doCronAdd(e.time, e.task);
        if (rcd) {
            mastertasks.push(rcd);
        }
    });
});

Clusters.OnBecomeSlaver(() => {
    // 停掉所有的集群任务
    mastertasks.forEach(e => {
        e.job.stop();
    });
    mastertasks.length = 0;
});

function doCronAdd(time: string, task: AbstractCronTask, id?: string): TaskRecord {
    let r: TaskRecord = null;
    try {
        let job = new cron.CronJob(time, () => {
            logger.log("执行一次计划任务 {{=it.name}}", {name: GetObjectClassName(task)});
            task.main();
        }, () => {
            task.stopped();
        }, true, 'Asia/Shanghai');
        r = {
            id: id,
            time: time,
            task: task,
            job: job
        };
    }
    catch (err) {
        logger.error(err);
    }
    return r;
}

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