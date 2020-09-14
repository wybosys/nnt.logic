import {SObject} from "./sobject";
import {IndexedObject} from "./kernel";
import {CancelDelay, DateTime, Delay, DelayHandler, Interval} from "./time";
import {logger} from "./logger";
import {kSignalRemoved, Slot} from "./signals";
import {colinteger, colmap, colstring} from "../store/proto";
import {integer_t, string_t} from "./proto";
import {Clusters} from "../manager/clusters";

export const kSignalStateChanged = "::nnt::fsm::state::chagned";
export const kSignalStatusChanged = "::nnt::fsm::status::changed";
export const kSignalStatusSet = "::nnt::fsm::status::set";
export const kSignalStatusUnset = "::nnt::fsm::status::unset";
export const kSignalStatusTimeout = "::nnt::fsm::status::timeout";

interface DelayState {
    delay: number;
    hdl: DelayHandler;
}

interface Status {
    hdl: DelayHandler;
}

// 有限状态机
export class Fsm extends SObject {

    constructor(idr: string) {
        super();
        this.idr = idr;
        this.signals.register(kSignalStateChanged);
        this.signals.register(kSignalStatusChanged);
        this.signals.register(kSignalStatusSet);
        this.signals.register(kSignalStatusUnset);
        this.signals.register(kSignalStatusTimeout);
        this.signals.register(kSignalRemoved);
    }

    // 定义状态的执行函数
    add(state: string, proc?: () => void) {
        if (this.signals.register(state))
            this.states.push(state);
        this.signals.connect(state, proc, this);
    }

    // 设置状态，如果已经是当前，则返回
    goto(state: string, delay?: number) {
        if (this.current == state) {
            logger.warn("重复进入状态 {{=it.state}}", {state: state});
            return;
        }
        this.force(state, delay);
    }

    // 强制开启状态
    force(state: string, delay?: number) {
        if (delay) {
            let hdl = Delay(delay, () => {
                delete this.delaystates[state];
                // 执行状态
                this.doSetState(state);
            });
            let ods: DelayState = this.delaystates[state];
            if (ods && ods.hdl)
                CancelDelay(ods.hdl); // 覆盖掉老的
            this.delaystates[state] = {time: delay, hdl: hdl};
        } else {
            this.doSetState(state);
        }
    }

    private doSetState(state: string) {
        // 去除延迟的状态，避免二次进入
        if (state in this.delaystates) {
            let ds: DelayState = this.delaystates[state];
            CancelDelay(ds.hdl);
            delete this.delaystates[state];
        }

        this.current = state;

        this.signals.emit(state);
        this.signals.emit(kSignalStateChanged);
    }

    cancel(state: string) {
        if (!(state in this.delaystates))
            return; // 没有什么状态可以被取消
        let ds: DelayState = this.delaystates[state];
        delete this.delaystates[state];
        CancelDelay(ds.hdl);
    }

    // 移出该状态机
    remove() {
        this.signals.emit(kSignalRemoved);
    }

    protected clear() {
        this.current = null;

        for (let k in this.delaystates) {
            let ds: DelayState = this.delaystates[k];
            if (ds.hdl)
                CancelDelay(ds.hdl);
        }
        this.delaystates = {};

        for (let k in this.status) {
            let st: Status = this.status[k];
            if (st.hdl)
                CancelDelay(st.hdl);
        }
        this.status = {};
    }

    // 当前的状态
    current: string;

    // 所有状态
    states = new Array<string>();

    // 延迟的状态
    delaystates: IndexedObject = {};

    // 标记
    idr: string; // 标记，可以用来找到对应的执行类

    // 子状态，支持长期留存，或者到期自动消失
    status: IndexedObject = {};

    // 设置子状态
    set(status: string, duration?: number) {
        // 先清除掉旧的再加新的
        this._doUnset(status);
        if (duration) {
            let hdl = Delay(duration, () => {
                delete this.status[status];
                this.signals.emit(kSignalStatusTimeout, status);
            });
            let os: Status = this.status[status];
            this.status[status] = {hdl: hdl};
        } else {
            this.status[status] = null;
        }
        this.signals.emit(kSignalStatusSet, status);
        this.signals.emit(kSignalStatusChanged);
    }

    unset(status: string) {
        this._doUnset(status);
        this.signals.emit(kSignalStatusUnset, status);
        this.signals.emit(kSignalStatusChanged);
    }

    private _doUnset(status: string) {
        if (!(status in this.status))
            return;
        let s: Status = this.status[status];
        if (s) {
            CancelDelay(s.hdl);
        }
        delete this.status[status];
    }

    isset(status: string): boolean {
        return status in this.status;
    }
}

// 分布式状态机（基于数据库实现）
// 原理：业务层定义状态机的实现，在将每组数据保存到数据库
// 启动一个1s为单位的Timer来遍历所有数据库中的状态机
// 同时对每隔状态机中保存的手动timer进行时间+1的操作，如果时间到，则修改对应的状态
// 业务层中发现状态激活，则修改数据到达下一个状态的处理
// 业务的查询层中直接从数据库中取得期望的状态机而不是从内存中取得，完成调用
// 所以业务层中每一个dfsm就是一个独立的表

export class DFsmRecord {

    @colstring()
    current: string;

    @colmap(string_t, integer_t)
    delays = new Map<string, number>();

    @colmap(string_t, integer_t)
    status = new Map<string, number>();

    @colinteger() // 开始的时间
    started: number;

    isset(status: string): boolean {
        return this.status.has(status);
    }
}

export interface DFsmSlotData {
    fsm: DFsmRecord;
    state?: string;
    status?: string;
}

export abstract class DFsm extends SObject {

    constructor() {
        super();
        this.signals.register(kSignalStateChanged);
        this.signals.register(kSignalStatusChanged);
        this.signals.register(kSignalStatusSet);
        this.signals.register(kSignalStatusUnset);
        this.signals.register(kSignalStatusTimeout);
        this.signals.register(kSignalRemoved);
    }

    add(state: string, proc?: (s: Slot) => void) {
        this.signals.register(state);
        this.signals.connect(state, proc, this);
    }

    goto(fsm: DFsmRecord, state: string, delay?: number) {
        if (fsm.current == state) {
            logger.warn("重复进入状态 {{=it.state}}", {state: state});
            return;
        }
        this.force(fsm, state, delay);
    }

    force(fsm: DFsmRecord, state: string, delay?: number) {
        if (delay) {
            fsm.delays.set(state, delay);
            this.onDelayChanged(fsm, state, delay, true);
        } else {
            this.doSetState(fsm, state);
        }
    }

    private doSetState(fsm: DFsmRecord, state: string) {
        // 去除延迟的状态，避免二次进入
        if (fsm.delays.has(state)) {
            fsm.delays.delete(state);
            this.onDelayChanged(fsm, state, 0, false);
        }

        // 保存当前状态
        fsm.current = state;
        this.onCurrentChanged(fsm, state);

        // 避免后处理的时候又修改状态，所以save提前
        this.signals.emit(state, {fsm: fsm});
        this.signals.emit(kSignalStateChanged, {fsm: fsm, state: state});
    }

    cancel(fsm: DFsmRecord, state: string) {
        if (!fsm.delays.has(state))
            return; // 没有什么状态可以被取消
        fsm.delays.delete(state);
        this.onDelayChanged(fsm, state, 0, false);
    }

    remove(fsm: DFsmRecord) {
        this.signals.emit(kSignalRemoved, {fsm: fsm});
    }

    set(fsm: DFsmRecord, status: string, duration?: number) {
        if (duration) {
            fsm.status.set(status, duration);
            this.onStatusChanged(fsm, status, duration, true);
        } else {
            fsm.status.set(status, null);
            this.onStatusChanged(fsm, status, null, true);
        }

        this.signals.emit(kSignalStatusSet, {fsm: fsm, status: status});
        this.signals.emit(kSignalStatusChanged, {fsm: fsm});
    }

    unset(fsm: DFsmRecord, status: string) {
        if (fsm.status.has(status)) {
            fsm.status.delete(status);
            this.onStatusChanged(fsm, status, 0, false);
        }

        this.signals.emit(kSignalStatusUnset, {fsm: fsm, status: status});
        this.signals.emit(kSignalStatusChanged, {fsm: fsm});
    }

    isset(fsm: DFsmRecord, status: string): boolean {
        return fsm.status.has(status);
    }

    elapse(fsm: DFsmRecord, time: number) {
        fsm.delays.forEach((delay, state) => {
            delay -= time;
            fsm.delays.set(state, delay);
            this.onDelayChanged(fsm, state, delay, delay > 0);
            if (delay <= 0) {
                if (state != fsm.current)
                    this.doSetState(fsm, state);
            }
        });

        fsm.status.forEach((duration, status) => {
            if (duration == null)
                return;
            duration -= time;
            fsm.status.set(status, duration);
            this.onStatusChanged(fsm, status, duration, duration > 0);
            if (duration <= 0) {
                fsm.status.delete(status);
                this.signals.emit(kSignalStatusTimeout, {fsm: fsm, status: status});
            }
        });
    }

    clearDelays(fsm: DFsmRecord) {
        fsm.delays.forEach((v, k) => {
            this.onDelayChanged(fsm, k, 0, false);
        });
        fsm.delays.clear();
    }

    clearStatus(fsm: DFsmRecord) {
        fsm.status.forEach((v, k) => {
            this.onStatusChanged(fsm, k, null, false);
        });
    }

    loop(): this {
        if (Clusters.IsMaster) {
            this._tmr.start();
        }
        loopingdfsms.add(this);
        return this;
    }

    unloop(): this {
        this._tmr.stop();
        return this;
    }

    // 重载获得所有数据
    protected abstract record(proc: (rcd: DFsmRecord) => void): void;

    // 启动状态机
    protected abstract start(fsm: DFsmRecord): Promise<void>;

    // 启动状态机
    protected abstract onStart(fsm: DFsmRecord): void;

    // 当前状态改变
    protected abstract onCurrentChanged(fsm: DFsmRecord, state: string): void;

    // 延迟状态改变
    protected abstract onDelayChanged(fsm: DFsmRecord, state: string, delay: number, set: boolean): void;

    // 次级状态改变
    protected abstract onStatusChanged(fsm: DFsmRecord, status: string, duration: number, set: boolean): void;

    private _tmr = new Interval(1, () => {
        this.record(e => {
            if (e.started) {
                // 已经执行
                this.elapse(e, 1);
            } else {
                // 启动
                e.started = DateTime.Now();
                this.start(e);
                this.onStart(e);
            }
        });
    }, false);
}

let loopingdfsms = new Set<DFsm>();

Clusters.OnBecomeMaster(() => {
    loopingdfsms.forEach(e => {
        e.loop();
    });
});

Clusters.OnBecomeSlaver(() => {
    loopingdfsms.forEach(e => {
        e.unloop();
    });
});
