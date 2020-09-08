import {action, IRouter} from "../../nnt/core/router";
import {Trans} from "../model/trans";
import {
    ImMessage,
    ImMessages,
    ImMessageUnreadCount,
    ImNewMessage,
    ImSignalSignatureCode,
    ImUserLogin,
    ImUserLogout
} from "../model/im";
import {STATUS} from "../../nnt/core/models";
import {Find} from "../../nnt/manager/servers";
import {Multiplayers, Transaction} from "../../nnt/server/multiplayers";
import {logger} from "../../nnt/core/logger";
import {SocketConnector, WebSocketSession} from "../../nnt/session/logic";
import {kSignalOpen} from "../../nnt/core/signals";
import {RSample} from "./sample";
import {ImNewmsg} from "../model/framework-nntlogic-apis";

// 演示用的客户端
class ImClient {

    connect(host: string, user: string, sid: string) {
        // 连接服务器
        this._ses.connector = new SocketConnector();
        this._ses.host = host;
        this._ses.SID = sid;
        this._ses.signals.connect(kSignalOpen, () => {
            // 等待接受消息
            let m = ImNewmsg();
            this._ses.watch(m, nm => {
                this.receive(nm.data);
            });
        }, null);
        this._ses.open();
    }

    receive(msg: ImNewMessage) {
        let n = new ImNewMessage();
        n.from = msg.from;
        n.to = msg.to;
        n.content = msg.content;
        this.unreadeds.push(n);
    }

    code(): string {
        return "";
    }

    unreadeds: ImMessage[] = [];

    // 链接服务端使用的ses
    private _ses = new WebSocketSession();
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

        // 登录换取sid
        trans.sid = await RSample.Login(m.user);
        trans.responseSessionId = true;

        // 链接ws服务器
        let fnd = <Multiplayers>Find("sample");
        let host = 'ws://' + (fnd.listen ? fnd.listen : "localhost") + `:${fnd.port}/json`;
        cli.connect(host, m.user, trans.sid);

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
        m.from = trans.userIdentifier();
        Multiplayers.AcquireOnlineUser("amqp", m.to).then(mq => {
            let nm = new ImNewMessage();
            nm.from = m.from;
            nm.to = m.to;
            nm.content = m.content;
            nm.crypto = m.crypto;
            mq.produce(Transaction.Encode(nm));
        });
        trans.submit();
    }

    @action(ImMessageUnreadCount)
    unreadcount(trans: Trans) {
        let m: ImMessageUnreadCount = trans.model;
        let user = trans.userIdentifier();
        m.count = this._clients.get(user).unreadeds.length;
        trans.submit();
    }

    @action(ImNewMessage)
    newmsg(trans: Trans) {
        trans.model = null;
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