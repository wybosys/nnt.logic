import {Config} from "../manager/config";
import {ArrayT} from "../core/arrayt";

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
        if (e === null)
            return false;

        // 仅--debug打开
        if (e == "debug")
            return Config.DEBUG;
        // 仅--develop打开
        if (e == "develop")
            return Config.DEVELOP;
        // 仅--publish打开
        if (e == "publish")
            return Config.PUBLISH;
        // 仅--distribution打开
        if (e == "distribution")
            return Config.DISTRIBUTION;
        // 处于publish或distribution打开
        if (e == "release")
            return Config.PUBLISH || Config.DISTRIBUTION;
        // 运行在devops容器中
        if (e == "devops")
            return Config.DEVOPS;
        // 容器内网测试版
        if (e == "devops-develop" || e == "devopsdevelop")
            return Config.DEVOPS_DEVELOP;
        // 容器发布版本
        if (e == "devops-release" || e == "devopsrelease")
            return Config.DEVOPS_RELEASE;
        // 本地运行
        if (e == "local")
            return Config.LOCAL;

        let argv = process.argv;
        if (argv.indexOf('--' + e) != -1)
            return true;

        return false;
    });
    return fnd != null;
}

