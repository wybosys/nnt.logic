import {AbstractServer} from "../../server/server";
import {Node} from "../../config/config";
import {static_cast} from "../../core/core";
import {logger} from "../../core/logger";

interface YigamesConfig {

    // 连接debug服务
    debug: boolean;

    // 游戏id
    gameid: number;

    // 游戏key
    gamekey: string;

    // 是否为微信版
    wechat: boolean;
}

export class Yigames extends AbstractServer {

    config(cfg: Node): boolean {
        if (!super.config(cfg))
            return false;
        let c = static_cast<YigamesConfig>(cfg);
        if (!c.gameid || !c.gamekey)
            return false;
        if (c.wechat) {
            this.host = "https://wxgames.91yigame.com/platform/open/";
        } else {
            if (c.debug)
                this.host = "http://develop.91egame.com/platform/open/";
            else
                this.host = "https://www.91yigame.com/platform/open/";
        }
        this.gameid = c.gameid;
        this.gamekey = c.gamekey;
        return true;
    }

    host: string;
    gameid: number;
    gamekey: string;

    async start() {
        logger.info("连接 {{=it.id}}@sdks", {id: this.id});
    }

    async stop() {
        // pass
    }
}
