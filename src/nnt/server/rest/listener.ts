// sid => [model] 的映射
// 当service.update调用时，依次处理每一个model
// 当expire时，清空clientId对应的数据，再当service.update调用时，返回错误码通知客户端重新监听

import {EmptyTransaction, Transaction} from "../transaction";
import {Call} from "../../manager/servers";
import {Config} from "../../manager/config";
import {STATUS} from "../../core/models";
import {CancelRepeat, DateTime, Repeat} from "../../core/time";
import {logger} from "../../core/logger";

export enum ListenMode {
    LISTEN = 1, // 发起监听
    UNLISTEN = 2, // 取消监听
    RESPOND = 3, // 监听返回数据
}

class ListenObject {
    srvid: string;
    action: string;
    params: any;
}

class Listeners {

    constructor() {
        // 启动时就可以开始检查
        this._actAppStart();
    }

    exists(sid: string, cid: string): boolean {
        let s = this._store.get(sid);
        if (!s)
            return false;
        let c = s.get(cid);
        if (!c)
            return false;
        return true;
    }

    set(sid: string, cid: string, mid: number, obj: ListenObject) {
        let s = this._store.get(sid);
        if (!s) {
            s = new Map();
            this._store.set(sid, s);
        }
        let c = s.get(cid);
        if (!c) {
            c = new ListenObjects();
            s.set(cid, c);
        }
        c.set(mid, obj);
    }

    delete(sid: string, cid: string, mid: number) {
        let s = this._store.get(sid);
        if (!s)
            return;
        let c = s.get(cid);
        if (!c)
            return;
        c.delete(mid);
    }

    size(sid: string, cid: string): number {
        let s = this._store.get(sid);
        if (!s)
            return 0;
        let c = s.get(cid);
        if (!c)
            return 0;
        return c.size;
    }

    clear(sid: string) {
        this._store.delete(sid);
    }

    get(sid: string, cid: string): ListenObjects {
        let s = this._store.get(sid);
        if (!s)
            return null;
        let c = s.get(cid);
        // 刷新一下访问时间
        if (c)
            c.lat = DateTime.Now();
        return c;
    }

    // sid => cid => objects 支持一个sid下多个客户端的访问
    private _store = new Map<string, Map<string, ListenObjects>>();

    protected _tmrClean: any;

    private _actAppStart() {
        this._tmrClean = Repeat(Config.SID_EXPIRE, () => {
            let now = DateTime.Now();
            // 清除过期的
            this._store.forEach((s, sid) => {
                s.forEach((c, cid) => {
                    if (now - c.lat >= Config.CID_EXPIRE)
                        s.delete(cid);
                });
                // 清除空监听
                if (s.size == 0)
                    this._store.delete(sid);
            });
        });
    }

    private _actAppStop() {
        CancelRepeat(this._tmrClean);
    }
}

class ListenObjects {

    set(mid: number, obj: ListenObject) {
        this._store.set(mid, obj);
    }

    get(mid: number): ListenObject {
        return this._store.get(mid);
    }

    delete(mid: number) {
        this._store.delete(mid);
    }

    get size(): number {
        return this._store.size;
    }

    entries() {
        return this._store.entries();
    }

    forEach(proc: (v: ListenObject, k: number) => void) {
        this._store.forEach(proc);
    }

    // last access time 最后一次访问时间，如果超过USER_EXPIRE，则认为是长期掉线
    lat: number = DateTime.Now();

    private _store = new Map<number, ListenObject>();
}

let listeners = new Listeners();

// 支持同一个sid同时在多个终端上使用，那么model的id就有可能重复，所以需要再次分组形成 sid -> cid -> [models] 的结构

export function AddListener(trans: Transaction): boolean {
    let sid = trans.sessionId();
    let cid = trans.clientId();
    if (!sid || !cid)
        return false;

    let t = new ListenObject();
    t.srvid = trans.server.id;
    t.action = trans.action;

    // 转换listen标记
    trans.params["_listening"] = trans.params["_listen"];
    delete trans.params["_listen"];
    t.params = trans.params;

    let mid = listeners.size(sid, cid);
    trans.model["_mid"] = mid;
    listeners.set(sid, cid, mid, t);
    return true;
}

export function RemoveListener(trans: Transaction) {
    let sid = trans.sessionId();
    let cid = trans.clientId();
    let mid = trans.model["_mid"];
    listeners.delete(sid, cid, mid);
}

// mid => transaction
export type ProcessListenerResult = Map<number, Transaction>;

// 处理监听
// @param action 可以为null，代表match任何action，否则和router.action进行严格比对
export function ProcessListener(sid: string, cid: string, action: string, cb?: (result: ProcessListenerResult) => void) {
    let objs = listeners.get(sid, cid);
    if (!objs) {
        cb && cb(null);
        return;
    }
    let models = new Map<number, Transaction>();
    IteratorListener(objs.entries(), action, models, cb);
}

function IteratorListener(iter: any, action: string, result: ProcessListenerResult, complete?: (result: ProcessListenerResult) => void) {
    let res = iter.next();
    if (res.done) {
        complete && complete(result);
        return;
    }

    let mid = res.value[0];
    let obj: ListenObject = res.value[1];
    if (action && action != obj.action) {
        IteratorListener(iter, action, result, complete);
        return;
    }

    // 客户端通过该标记判断是监听模式的哪一种
    obj.params["_listening"] = ListenMode.RESPOND;

    Call(obj.srvid, obj.action, obj.params).then(t => {
        if (t.status == STATUS.OK)
            result.set(mid, t);
        IteratorListener(iter, action, result, complete);
    });
}

// 封装成listener对应的transaction
export function InstanceListenerTransaction(sid: string, cid: string, action: string): Transaction[] {
    let objs = listeners.get(sid, cid);
    if (!objs) {
        logger.warn("没有找到 {{=it.cid}}@{{=it.sid}} 的监听对象", {sid: sid, cid: cid});
        return [];
    }

    let r = new Array();
    objs.forEach(e => {
        if (action && e.action != action)
            return;
        let t = new EmptyTransaction();
        t.status = STATUS.OK;
        t.action = e.action;
        t.params = e.params;

        // 客户端通过该标记判断是监听模式的哪一种
        e.params["_listening"] = ListenMode.RESPOND;

        r.push(t);
    });
    return r;
}