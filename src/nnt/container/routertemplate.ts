import {AbstractTemplate} from "./container";
import {static_cast} from "../core/core";
import {Find} from "../manager/servers";
import {Node} from "../config/config";
import {IRouterable} from "../server/routers";

export interface RouterTemplateNode {

    // 路由绑定的目标服务器
    server: string;
}

export abstract class RouterTemplate extends AbstractTemplate {

    config(cfg:Node):boolean {
        if (!super.config(cfg))
            return false;
        let c = static_cast<RouterTemplateNode>(cfg);
        this.server = static_cast<IRouterable>(Find(c.server));
        if (!this.server)
            return false;
        return true;
    }

    server: IRouterable;
}