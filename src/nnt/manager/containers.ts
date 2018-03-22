import {Node, NodeIsEnable} from "../config/config";
import {Clear, ITemplate, RegisterTemplate} from "../container/container";
import {App} from "./app";
import {SyncArray} from "../core/kernel";

export async function Start(cfg: Node[]): Promise<void> {
    if (!cfg.length) {
        await Stop();
        return;
    }

    await SyncArray(cfg).forEach(async e => {
        if (!NodeIsEnable(e))
            return;
        if (!e.entry)
            return;
        let t: ITemplate = App.shared().instanceEntry(e.entry);
        if (!t)
            return;
        if (!t.config(e))
            return;
        RegisterTemplate(t);
    });
}

export async function Stop(): Promise<void> {
    Clear();
}