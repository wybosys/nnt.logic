import {DOMAIN_GROUPS, DOMAIN_ROOMS, DOMAIN_USERS, DOMAIN_USERS_ONLINE, IImCallback, Im, SUPPORT_DOMAINS} from "../im";
import {Insert, QueryAll, UpdateAll} from "../../manager/dbmss";
import {auth, Decode, input, model, string} from "../../core/proto";
import {colinteger, GetInnerId, Output, table} from "../../store/proto";
import {logger} from "../../core/logger";
import {ArrayT} from "../../core/kernel";
import {IM_DBID, IM_TBID, Message, Messages, mid_parse, mid_t, STATUS} from "../../core/models";
import {action, IRouter} from "../../core/router";
import {Transaction} from "../transaction";
import {static_cast} from "../../core/core";
import {Connector} from "../socket";
import {Variant} from "../../core/object";

@model([auth], Message)
@table(IM_DBID, IM_TBID)
export class ImMessage extends Message {

    @string(1, [input])
    from: mid_t;

    @string(2, [input])
    to: mid_t;

    @colinteger()
    status: ImMessageStatus = ImMessageStatus.UNREADED;

    copy(r: ImMessage): boolean {
        super.copy(r);
        this.status = r.status;
        return true;
    }
}

enum ImMessageStatus {
    UNREADED = 0,
    READED = 1,
}

// 当发送消息时调用处理器来处理消息
export interface ImMessageHook {

    // 如果返回false，则该条消息被过滤
    process(msg: Message): Promise<boolean>;
}

// 使用rest来进行im时的服务
export class ImService implements IRouter {

    constructor(im: Im) {
        this.im = im;
    }

    action = "im";
    im: Im;

    @action(ImMessage)
    async send(trans: Transaction) {
        let m: ImMessage = trans.model;
        if (!m.from)
            m.fromi = this.im.mid(trans);
        if (!ImService.CheckMsg(m)) {
            logger.log("检查消息失败");
            trans.status = STATUS.IM_CHECK_FAILED;
            trans.submit();
            return;
        }
        // 通过高权限接口的请求，不做关系检查，避免出现删除后还需要发送通知而无法发出去的问题
        let ac = trans.ace;
        if (ac && !ac.errorchk) {
            this.doSend(m);
            trans.submit();
            return;
        }
        // 如果关系不存在，则不能发送
        let res = await this.im.isvalid(m.fromi, m.toi);
        if (!res) {
            trans.status = STATUS.IM_NO_RELEATION;
            trans.submit();
            return;
        }
        this.doSend(m);
        trans.submit();
    }

    static CheckMsg(m: ImMessage): boolean {
        if (!m.fromi) {
            m.fromi = mid_parse(m.from);
            if (!m.fromi)
                return false;
        }
        if (!m.toi) {
            m.toi = mid_parse(m.to);
            if (!m.toi)
                return false;
        }
        if (SUPPORT_DOMAINS.indexOf(m.fromi.domain) == -1 ||
            SUPPORT_DOMAINS.indexOf(m.toi.domain) == -1) {
            logger.log("遇到了不支持的domain");
            return false;
        }
        return true;
    }

    protected async post(msg: ImMessage) {
        // 写入到数据库
        await Insert(Message, Output(msg));
        // 回调成功
        let im = static_cast<IImCallback>(this.im);
        im.onPosted(msg);
    }

    protected async doSend(msg: ImMessage) {
        // 投递数据库，用户是以users结尾，群是以groups结尾，群的话需要分别投递到组员账户中
        if (msg.toi.domain == DOMAIN_USERS || msg.toi.domain == DOMAIN_USERS_ONLINE) {
            this.post(msg);
        }
        else if (msg.toi.domain == DOMAIN_GROUPS) {
            // 相对于group的发送者
            let sender = msg.fromi;
            if (msg.fromi.domain == DOMAIN_USERS) {
                msg.fromi = {user: msg.toi.user, domain: DOMAIN_GROUPS, resources: [sender.user]};
            }
            if (!await ImService.RunHooks(msg, this.hooksPost))
                return;
            this.post(msg);
        }
        else if (msg.toi.domain == DOMAIN_ROOMS) {
            let sender = msg.fromi;
            // 相对于rooms的发送者，user->rooms
            if (msg.fromi.domain == DOMAIN_USERS) {
                msg.fromi = {
                    user: msg.toi.user,
                    domain: DOMAIN_ROOMS,
                    resources: [msg.toi.resources[0], msg.toi.resources[1], msg.toi.user, msg.fromi.user]
                };
            }
            if (!await ImService.RunHooks(msg, this.hooksPost))
                return;
            this.post(msg);
        }
        else {
            logger.fatal("im::send 无法处理这条消息");
        }
    }

    @action(Messages)
    async receive(trans: Transaction) {
        let m: Messages = trans.model;
        m.toi = this.im.mid(trans);
        if (!m.toi) {
            trans.status = STATUS.IM_CHECK_FAILED;
            trans.submit();
            return;
        }
        // 只接受用户消息的监听
        if (m.toi.domain != DOMAIN_USERS) {
            trans.status = STATUS.IM_CHECK_FAILED;
            trans.submit();
            return;
        }
        // 过滤可用的消息
        let arr = await QueryAll(Message, {
            "toi.user": m.toi.user, "status": ImMessageStatus.UNREADED
        });
        // 设置成已读
        if (arr.length) {
            let ids = ArrayT.Convert(arr, e => {
                return GetInnerId(e);
            });
            UpdateAll(Message, null, [
                {_id: {$in: ids}},
                {$set: {"status": ImMessageStatus.READED}}
            ]);
        }
        m.items = arr;
        trans.submit();
    }

    hooksPost = new Array<ImMessageHook>();

    static async RunHooks(msg: Message, hooks: ImMessageHook[]): Promise<boolean> {
        for (let i = 0, l = hooks.length; i < l; ++i) {
            let res = await hooks[i].process(msg);
            if (!res)
                return false;
        }
        return true;
    }
}

export class ImConnector extends Connector {

    convert(msg: Variant): Message {
        let it = new Message();
        Decode(it, msg.toJsObj());
        return it;
    }

    post(msg: Message) {

    }
}