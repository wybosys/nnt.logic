// 服务端的热更服务，支持热更的代码一定时具有低耦合度的代码
import watch = require("watch");
import {AbstractServer} from "./server";
import {Node} from "../config/config";
import {expand} from "../core/url";
import {logger} from "../core/logger";
import {ArrayT} from "../core/arrayt";
import {Multimap} from "../core/map";

interface HotUpgradeNode extends Node {

    // 监听的目录
    watch: string[];
}

let PAT_MODELFILE = /\.js$/

export class HotUpgrade extends AbstractServer {

    config(cfg: Node): boolean {
        if (!super.config(cfg))
            return false;
        let c = <HotUpgradeNode>cfg;
        if (!c.watch || !c.watch.length)
            return false;
        this.watch = ArrayT.Convert(c.watch, expand);
        return true;
    }

    watch: string[];
    protected monitors = new Array<watch.Monitor>();

    async start(): Promise<void> {
        this.watch.forEach(path => {
            watch.createMonitor(path, monitor => {
                monitor.on("created", (f: any, stat) => {
                    if (!f.match(PAT_MODELFILE))
                        return;
                    let mnm = require.resolve(f);
                    if (!require(mnm)) {
                        logger.warn("热更添加失败 {{=it.file}}", {file: mnm});
                    } else {
                        logger.info("热更添加 {{=it.file}}", {file: mnm});
                    }
                });
                monitor.on("changed", (f: any, cur, pre) => {
                    if (!f.match(PAT_MODELFILE))
                        return;
                    let mnm = require.resolve(f);
                    let old = require.cache[mnm];
                    if (!old)
                        return;
                    require.cache[mnm] = null;
                    let nem: any;
                    try {
                        nem = require(mnm);
                    } catch (err) {
                    }
                    if (!nem) {
                        logger.warn("热更失败 {{=it.file}}", {file: mnm});
                        require.cache[mnm] = old;
                    } else {
                        this._olds.push(mnm, old.exports);
                        // 刷新所有的老定义
                        this._olds.get(mnm).forEach(oldexp => {
                            for (let ek in oldexp) {
                                let oldclz = oldexp[ek];
                                let newclz = nem[ek];
                                if (!newclz || !newclz.prototype) // 新的模块不存在，为了避免正在运行的挂掉，所以不做修改
                                    continue;
                                // 用新的proto替换老的
                                Object.getOwnPropertyNames(newclz.prototype).forEach(e => {
                                    try {
                                        oldclz.prototype[e] = newclz.prototype[e];
                                    } catch (err) {
                                    }
                                });
                            }
                        });
                        logger.info("热更成功 {{=it.file}}", {file: mnm});
                    }
                });
                monitor.on("remove", (f, stat) => {
                    if (!f.match(PAT_MODELFILE))
                        return;
                    let mnm = require.resolve(f);
                    require.cache[mnm] = null;
                    logger.info("热更移出 {{=it.file}}", {file: mnm});
                });
                this.monitors.push(monitor);
            });
        });
    }

    async stop(): Promise<void> {
        this.monitors.forEach(e => {
            e.stop();
        });
        this.monitors.length = 0;
    }

    // 热更时需要更新整个历史周期内的类，所以需要保存所有历史的
    protected _olds = new Multimap<string, any>();

}