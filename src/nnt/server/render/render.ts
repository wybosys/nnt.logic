import {logger} from "../../core/logger";
import {Json} from "./json";
import {Transaction, TransactionSubmitOption} from "../transaction";
import {Raw} from "./raw";

export abstract class AbstractRender {

    // 输出的类型
    type: string;

    // 渲染
    abstract render(trans: Transaction, opt?: TransactionSubmitOption): string;
}

let renders = new Map<string, AbstractRender>();

// 注册渲染组件
export function RegisterRender(name: string, render: AbstractRender) {
    if (renders.get(name)) {
        logger.fatal("重复注册渲染器{{=it.name}}", {name: name});
        return;
    }
    renders.set(name, render);
}

export function FindRender(name: string): AbstractRender {
    let r = renders.get(name);
    return r ? r : renders.get("json");
}

RegisterRender("json", new Json());
RegisterRender("raw", new Raw());
