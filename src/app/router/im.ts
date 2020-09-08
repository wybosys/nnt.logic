import {action, IRouter} from "../../nnt/core/router";
import {Trans} from "../model/trans";
import {
    ImMessage,
    ImMessages,
    ImMessageUnreadCount,
    ImSignalSignatureCode,
    ImUserLogin,
    ImUserLogout
} from "../model/im";
import {STATUS} from "../../nnt/core/models";
import {Find} from "../../nnt/manager/servers";
import {Multiplayers} from "../../nnt/server/multiplayers";
import {logger} from "../../nnt/core/logger";

// 演示用的客户端
class ImClient {

    async connect(host: string, user: string): Promise<boolean> {
        return false;
    }

    async receive(msg: ImMessage) {

    }

    code(): string {
        return "";
    }

    unreadeds: ImMessage[] = [];
}

// 演示实现Im通信
export class RIm implements IRouter {
    action = "im";

    private _clients = new Map<string, ImClient>();

    @action(ImUserLogin)
    async login(trans: Trans) {
        let m: ImUserLogin = trans.model;
        if (this._clients.has(m.user)) {
            trans.status = STATUS.TARGET_EXISTS;
            trans.submit();
            return;
        }

        // 先设置避免重复链接
        let cli = new ImClient();
        this._clients.set(m.user, cli);

        // 获得目标服务器地址
        let fnd = <Multiplayers>Find("sample");
        let host = fnd.listen ? fnd.listen : "localhost";
        if (!await cli.connect(host, m.user)) {
            trans.status = STATUS.FAILED;
            trans.submit();
            return;
        }

        logger.log(`${m.user} 上线`);
        trans.submit();
    }

    @action(ImUserLogout)
    logout(trans: Trans) {
        let user = trans.userIdentifier();
        if (!this._clients.has(user)) {
            trans.status = STATUS.TARGET_NOT_FOUND;
            trans.submit();
            return;
        }

        logger.log(`${user} 离线`);
        trans.submit();
    }

    @action(ImMessage)
    send(trans: Trans) {
        let m: ImMessage = trans.model;
    }

    @action(ImMessageUnreadCount)
    unreadcount(trans: Trans) {
        let m: ImMessageUnreadCount = trans.model;
        let user = trans.userIdentifier();
        m.count = this._clients.get(user).unreadeds.length;
        trans.submit();
    }

    @action(ImMessages)
    receive(trans: Trans) {
        let m: ImMessages = trans.model;
        let user = trans.userIdentifier();
        let cl = this._clients.get(user);
        m.messages = cl.unreadeds;
        cl.unreadeds = [];
        trans.submit();
    }

    @action(ImSignalSignatureCode, [], "获得本地链接签名code")
    signcode(trans: Trans) {
        let m: ImSignalSignatureCode = trans.model;
        let user = trans.userIdentifier();
        let cl = this._clients.get(user);
        m.signcode = cl.code();
        trans.submit();
    }
}