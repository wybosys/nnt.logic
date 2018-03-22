import {logger} from "../core/logger";
import {Json} from "./json";
import {Protobuf} from "./protobuf";
import {Vue} from "./vue";
import {Transaction} from "../server/transaction";
import {Raw} from "./raw";

export interface IRender {

    // 输出的类型
    type: string;

    // 渲染
    render(trans: Transaction): string;
}

let renders = new Map<string, IRender>();

// 注册渲染组件
export function RegisterRender(name: string, render: IRender) {
    if (renders.get(name)) {
        logger.fatal("重复注册渲染器{{=it.name}}", {name: name});
        return;
    }
    renders.set(name, render);
}

export function FindRender(name: string): IRender {
    let r = renders.get(name);
    return r ? r : renders.get("json");
}

RegisterRender("json", new Json());
RegisterRender("pb", new Protobuf());
RegisterRender("vue", new Vue());
RegisterRender("raw", new Raw());
