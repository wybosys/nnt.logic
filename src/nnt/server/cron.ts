import {AbstractServer} from "./server";
import {Node} from "../config/config";
import {static_cast} from "../core/core";
import {App} from "../manager/app";
import {logger} from "../core/logger";
import {CronAdd} from "../manager/crons";

interface TaskConfig {

    // 执行的任务
    task: string;

    // 时间设置
    time: string;

    // 是否添加到集群中，需要使用Clusters进行集群初始化
    cluster: boolean;
}

interface CronConfig {

    // 需要运行的服务实体
    task: TaskConfig[];
}

export class Cron extends AbstractServer {

    config(cfg: Node): boolean {
        if (!super.config(cfg))
            return false;
        let c = static_cast<CronConfig>(cfg);
        this.task = c.task || [];
        return true;
    }

    task: TaskConfig[];

    async start(): Promise<void> {
        this.task.forEach(e => {
            let ent = App.shared().instanceEntry(e.task);
            if (!ent) {
                logger.fatal("没有找到对象 " + e.task);
                return;
            }
            CronAdd(e.time, ent, e.cluster);
        });
        logger.info("启动 {{=it.id}}@cron", {id: this.id});
    }

    async stop(): Promise<void> {
        logger.info("没有支持task服务的停止");
    }
}