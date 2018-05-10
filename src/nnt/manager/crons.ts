import cron = require("cron");
import {logger} from "../core/logger";
import {GetObjectClassName, static_cast} from "../core/core";
import {Clusters} from "./clusters";
import {ArrayT} from "../core/kernel";

export abstract class AbstractCronTask {

    // 绑定的任务id
    get id(): string {
        return this._id;
    }

    // 执行依赖的时间
    get time(): string {
        return this._time;
    }

    // 主执行函数
    abstract main(): void;

    // 停止
    stopped() {
    }

    // 是否位于计划任务中
    get croning(): boolean {
        return this._job && this._job.running;
    }

    protected _id: string;
    private _time: string;
    private _job: cron.CronJob;
}

interface IAbstractCronTask {
    _id: string;
    _time: string;
    _job: cron.CronJob;
}

// 普通任务
let tasks = new Array<AbstractCronTask>();

// 集群任务
let mastertasks = new Array<AbstractCronTask>();

// 没有跑起来的集群任务
let masteralltasks = new Array<AbstractCronTask>();

// 添加任务
// clusters 在集群中添加任务，会保证集群中只有一个运行
export function CronAdd(time: string, task: AbstractCronTask, clusters: boolean, id?: string): boolean {
    if (!clusters) {
        if (doCronAdd(time, task, id)) {
            tasks.push(task);
            return true;
        }
        return false;
    }

    // 只有集群中的主服务可以添加任务
    if (Clusters.IsMaster) {
        if (doCronAdd(time, task)) {
            mastertasks.push(task);
            masteralltasks.push(task);
            return true;
        }
        return false;
    }

    let itask = static_cast<IAbstractCronTask>(task);
    itask._id = id;
    itask._time = time;
    masteralltasks.push(task);
    return true;
}

// 删除任务
export function CronRemove(task: AbstractCronTask) {
    let itask = static_cast<IAbstractCronTask>(task);
    // 停止任务
    if (itask._job)
        itask._job.stop();
    // 从集合中移除
    ArrayT.RemoveObject(tasks, task);
    ArrayT.RemoveObject(mastertasks, task);
    ArrayT.RemoveObject(masteralltasks, task);
}

Clusters.OnBecomeMaster(() => {
    masteralltasks.forEach(e => {
        if (doCronAdd(e.time, e, e.id)) {
            mastertasks.push(e);
        }
    });
});

Clusters.OnBecomeSlaver(() => {
    // 停掉所有的集群任务
    mastertasks.forEach(e => {
        let itask = static_cast<IAbstractCronTask>(e);
        itask._job.stop();
    });
    mastertasks.length = 0;
});

function doCronAdd(time: string, task: AbstractCronTask, id?: string): boolean {
    let itask = static_cast<IAbstractCronTask>(task);
    try {
        itask._id = id;
        itask._time = time;
        itask._job = new cron.CronJob(time, () => {
            logger.log("执行一次计划任务 {{=it.name}}", {name: GetObjectClassName(task)});
            task.main();
        }, () => {
            task.stopped();
        }, true, 'Asia/Shanghai');
    }
    catch (err) {
        logger.error(err);
        return false;
    }
    return true;
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