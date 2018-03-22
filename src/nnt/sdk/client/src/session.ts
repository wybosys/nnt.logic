import {Base, Paged} from "./model";
import {Random} from "./utils";
import {EventDispatcher} from "./eventdispatcher";

export type SuccessCallback<T> = (m: T) => void;
export type ErrorCallBack = (err: Error, resp?: any) => void;

export abstract class Session {

    static ISHTTPS = document.location.protocol == "https:";
    static EVENT_SID_CHANGED = "::nnt::session::sid::changed";

    // 获取一个模型
    abstract fetch<T extends Base>(m: T, suc: SuccessCallback<T>, err: ErrorCallBack): void;

    // 监听模型
    abstract listen<T extends Base>(m: T, suc: SuccessCallback<T>, err: ErrorCallBack): void;

    // 取消模型监听
    abstract unlisten<T extends Base>(m: T, suc: SuccessCallback<T>, err: ErrorCallBack): void;

    protected static _default: Session;

    // 获取一个分页数据
    page<T extends Paged & Base>(m: T, suc: SuccessCallback<T>, err: ErrorCallBack) {
        if (m.ended) {
            m.items.length = 0;
            suc(m);
            return;
        }
        if (!m.limit)
            m.limit = Session.PAGE_LEN;
        if (m.all == null)
            m.all = [];
        this.fetch(m, m => {
            if (m.items.length) {
                m.items.forEach(e => {
                    m.all.push(e);
                });
            }
            m.ended = m.items.length < m.limit;
            suc(m);
        }, err);
    }

    // 设置为默认session
    setAsDefault() {
        Session._default = this;
    }

    static Fetch<T extends Base>(m: T, suc: SuccessCallback<T>, err?: ErrorCallBack) {
        Session._default.fetch(m, suc, err);
    }

    static Listen<T extends Base>(m: T, suc: SuccessCallback<T>, err?: ErrorCallBack) {
        Session._default.listen(m, suc, err);
    }

    static Unlisten<T extends Base>(m: T, suc: SuccessCallback<T>, err?: ErrorCallBack) {
        Session._default.unlisten(m, suc, err);
    }

    static Page<T extends Paged & Base>(m: T, suc: SuccessCallback<T>, err?: ErrorCallBack) {
        Session._default.page(m, suc, err);
    }

    // 每次启动生成的CLIENTID
    static CID = Random.Rangei(0, 10000);

    private static _SID: string;
    static set SID(val: string) {
        if (val != Session._SID) {
            Session._SID = val;
            Session.EVENT.raiseEvent(Session.EVENT_SID_CHANGED);
        }
    }

    static get SID(): string {
        return Session._SID;
    }

    // 新客户端标记，只要有一次成功的rest.update请求，则变成旧客户端 new one client
    static NOC = true;

    // Model可以含有fields的最大数量
    static MODEL_FIELDS_MAX: number = 100;

    // 默认的Cache数据库名称
    static CACHE_DB: string = "::nnt::app";

    // 默认的一页的数目
    static PAGE_LEN = 10;

    // 当前连接
    static LOCATION: string = location.href;

    // 当前渠道
    static CHANNEL: string;

    static EVENT = new EventDispatcher();
}
