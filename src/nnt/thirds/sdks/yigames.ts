import {AbstractServer} from "../../server/server";
import {Node} from "../../config/config";
import {static_cast} from "../../core/core";
import {logger} from "../../core/logger";
import {IRouterable} from "../../server/routers";
import {action, expose, IRouter} from "../../core/router";
import {Find} from "../../manager/servers";
import {model} from "../../core/proto";
import {Transaction} from "../../server/transaction";

interface YigamesConfig {

    // 连接debug服务
    debug: boolean;

    // 游戏id
    gameid: number;

    // 游戏key
    gamekey: string;

    // 是否为微信版
    wechat: boolean;

    // 绑定到服务来测试
    attach: string;
}

@model([expose])
class UserLogin {

}

// 测试SDK的router
class TestYigames implements IRouter {
    action = "yigames";

    @action(UserLogin)
    async login(trans: Transaction) {
        trans.submit();
    }
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
            this.media = "https://wxgames.91yigame.com/platform/media/";
        } else {
            if (c.debug) {
                this.host = "http://develop.91egame.com/platform/open/";
                this.media = "http://develop.91egame.com/devops/media/";
            } else {
                this.host = "https://www.91yigame.com/platform/open/";
                this.media = "https://www.91yigame.com/platform/media/";
            }
        }
        this.gameid = c.gameid;
        this.gamekey = c.gamekey;
        this.attach = c.attach;
        return true;
    }

    host: string;
    media: string;

    gameid: number;
    gamekey: string;
    attach: string;

    async start() {
        logger.info("连接 {{=it.id}}@sdks", {id: this.id});

        if (this.attach) {
            let srv = static_cast<IRouterable>(Find(this.attach));
            srv.routers.register(new TestYigames());
        }
    }

    async stop() {
        // pass
    }

    // 管理员登录
    async adminLogin() {

    }

    // 获取管理员信息
    async adminInfo() {

    }

    // 普通用户登录
    async userLogin() {

    }

    // 普通用户注册
    async userRegister() {

    }

    // 获取普通用户信息
    async userInfo() {

    }

    // 更新普通用户信息
    async userUpdateInfo() {

    }
}
