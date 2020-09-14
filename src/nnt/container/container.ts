import {logger} from "../core/logger";
import {LayerMap} from "../core/map";
import {Node} from "../config/config";

export interface ITemplate {

    // 模板ID
    tid: string;

    // 实例化自己
    instance(): Promise<IInstance>;

    // 配置
    config(cfg: Node): boolean;

    // 注册成功
    registered(): void;
}

export interface IInstance {

    // 实例id
    iid: string;

    // 实例依赖的模板
    tpl: ITemplate;

    // 启动
    start(): void;

    // 停止
    stop(): void;
}

export abstract class AbstractTemplate implements ITemplate, IInstance {
    tid: string;
    iid: string;
    tpl: ITemplate;

    abstract instance(): Promise<IInstance>;

    config(cfg: Node): boolean {
        if (!cfg.id)
            return false;
        this.tid = cfg.id;
        return true;
    }

    start() {
    }

    stop() {
    }

    registered() {
    }
}

let templates = new Map<string, ITemplate>();

// tid : iid : [instance]
let instances = new LayerMap<string, IInstance>();

// 注册一个模板
export function RegisterTemplate(tpl: ITemplate) {
    templates.set(tpl.tid, tpl);
    tpl.registered();
}

// 实例化一个模板
// @params 额外的初始化参数
export function InstanceTemplate(tid: string, iid: string): Promise<IInstance> {
    return new Promise(resolve => {
        if (instances.has(tid, iid)) {
            logger.warn("已经存在该id的模板实例 {{=it.iid}}", {iid: iid});
            resolve(null);
            return;
        }
        let tpl = templates.get(tid);
        if (!tpl) {
            logger.warn("没有找到该模板 {{=it.tid}}", {tid: tid});
            resolve(null);
            return;
        }
        tpl.instance().then(m => {
            if (!m) {
                logger.warn("实例化模板失败 {{=it.tid}}", {tid: tid});
                return;
            }

            m.iid = iid;
            m.tpl = tpl;
            m.start();
            instances.setuq(m, tid, iid);
            logger.info("实例化模板 {{=it.tid}}@{{=it.iid}}", {tid: tid, iid: iid});

            resolve(m);
        });
    });
}

// 查找实例
export function Find(tid: string, iid: string): IInstance {
    return instances.getuq(tid, iid);
}

// 所有加载的实例
export function AllRunning(): IInstance[] {
    let r = new Array<IInstance>();
    instances.forEach(e => {
        r.push(e);
    });
    return r;
}

// 清空
export function Clear() {
    instances.forEach(e => {
        e.stop();
    });
    instances.clear();
    templates.clear();
}

// 清空运行得
export function ClearRunning() {
    instances.forEach(e => {
        e.stop();
    });
    instances.clear();
}