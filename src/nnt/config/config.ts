import {Config, IsDebug, IsDevops, IsDevopsDevelop, IsDevopsRelease, IsLocal, IsRelease} from "../manager/config";
import {ArrayT} from "../core/kernel";
import {logger} from "../core/logger";

export interface Node {

    // 配置标记值（不能重复）
    id: string;

    // 节点对应的实体路径
    entry?: string;

    // 开发模式，如果不配置，则代表任何模式都启用，否则只有命中的模式才启用
    enable?: string;
}

export class Attribute {

    static ToString(v: any[]): string {
        return v.join(",");
    }

    static FromString(v: string): string[] {
        return v.split(",");
    }
}

const ENV_PARSE = /\$\{?([a-zA-Z0-9_]+)\}?/;

// 判断此Node节点是否可用
export function NodeIsEnable(node: Node): boolean {
    if (!node.enable)
        return true;
    let conds = node.enable.split(",");
    // 找到一个满足的即为满足
    let fnd = ArrayT.QueryObject(conds, e => {
        if (e == "debug")
            return Config.DEBUG;
        if (e == "develop")
            return Config.DEVELOP;
        if (e == "publish")
            return Config.PUBLISH;
        if (e == "distribution")
            return Config.DISTRIBUTION;
        if (e == "local")
            return Config.DEBUG;
        if (e == "release")
            return Config.PUBLISH;
        if (e == "devops")
            return Config.DEVOPS;
        if (e == "devops-develop")
            return Config.DEVOPS_DEVELOP;
        if (e == "devops-release")
            return Config.DEVOPS_RELEASE;
        if (e == "local")
            return Config.LOCAL;

        let argv = process.argv;
        if (argv.indexOf('--' + e) != -1)
            return true;

        logger.fatal("配置遇到一个不支持的节点开关：{{=it.cond}}@{{=it.id}}", {id: node.id, cond: e});
        return false;
    });
    return fnd != null;
}

