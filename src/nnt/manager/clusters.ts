import cluster = require("cluster");
import os = require("os");
import {SObject, Variant} from "../core/object";
import {logger} from "../core/logger";
import {Find, Get, Set} from "./dbmss";
import {KvRedis} from "../store/kvredis";
import {static_cast, UUID} from "../core/core";
import {DateTime, Repeat} from "../core/time";
import {colinteger, colstring, Decode, Output} from "../store/proto";
import {IndexedObject, make_tuple} from "../core/kernel";
import {Message, mid_make} from "../core/models";
import {Acquire, IMQClient} from "../server/mq";
import {DOMAIN_CLUSTERS} from "../server/im";
import {Config} from "./config";

export class ClusterRecord {

    @colstring()
    hostname: string = os.hostname();

    @colinteger()
    processid: number = process.pid;

    @colinteger()
    time = DateTime.Now();

    @colinteger()
    heartbeat: number;

    @colinteger()
    heartbeats: number = 0; // 当前master心跳的累加
}

const CLUSTER_HEARTBEAT = 13;

/*
集群自举，通过对redis调用setnx来保证只有一个服务获得到key，再对key增加ttl
每隔ttl+1后，清除master的状态
所有服务再尝试一下获得key，获得key的成为master
 */
export class Clusters {

    static Run(proc: () => void, count: number = os.cpus().length) {
        if (count == -1) {
            count = os.cpus().length;
        }
        if (count == 1 || count == 0) {
            proc();
            return;
        }
        if (cluster.isMaster) {
            for (let i = 0; i < count; ++i)
                cluster.fork();
            cluster.on('exit', (worker, code, signal) => {
                console.log(`worker ${worker.process.pid} died`);
            });
        }
        else {
            proc();
            console.log(`Worker ${process.pid} started`);
        }
    }

    // 使用redis来实现算法
    static Listen(dbid: string, heartbeat: number = CLUSTER_HEARTBEAT) {
        _votes.listen(dbid, heartbeat);
    }

    static OnBecomeMaster(cb: () => void) {
        _votes.signals.connect(kSignalBecomeMaster, cb, null);
    }

    static OnBecomeSlaver(cb: () => void) {
        _votes.signals.connect(kSignalBecomeSlaver, cb, null);
    }

    static get IsMaster(): boolean {
        return _votes.isMaster;
    }

    // 设置当前为master
    static ForceMaster() {
        _votes.forceMaster();
    }

    static async Status(): Promise<ClusterRecord> {
        return Get(make_tuple(ClusterRecord, _votes.dbid), "master");
    }
}

const kSignalBecomeMaster = "::nnt::cluster::master::become";
const kSignalBecomeSlaver = "::nnt::cluster::master::lost";

class _ClusterVotes extends SObject {

    constructor() {
        super();
        this.signals.register(kSignalBecomeMaster);
        this.signals.register(kSignalBecomeSlaver);
    }

    listen(dbid: string, ttl: number) {
        if (this._listening) {
            logger.fatal("Cluster已经处于监听模式");
            return;
        }

        this._listening = true;
        this.dbid = dbid + ".cluster";

        // 查找redis服务进行locker操作
        let srv = Find(dbid);
        if (!(srv instanceof KvRedis)) {
            logger.fatal("Cluster的Listen只能建立在redis之上");
            return;
        }

        // 强制slaver，不参与master的推举
        if (Config.FORCE_SLAVER)
            return;

        // 强制master启动
        if (Config.FORCE_MASTER) {
            this.doBecomeMaster(true);
        }

        let redis = static_cast<KvRedis>(srv);
        redis.acquirelock("cluster.master", 0, suc => {
            this.doBecomeMaster(suc);
        });

        // 检查一下master是否离线
        Repeat(ttl, () => {
            Get(make_tuple(ClusterRecord, this.dbid), "master").then((rcd: ClusterRecord) => {
                if (!rcd || !rcd.heartbeat)
                    return; // 全新启动，必然会有一个是master，所以不处理null

                let now = DateTime.Now();
                if (this.isMaster) {
                    // 如果time和保存的不一样，则说明出现了双主的错误情景，则关掉当前作物的
                    if (rcd.time != this.info.time) {
                        this.isMaster = false;
                        this.signals.emit(kSignalBecomeSlaver);
                        logger.warn("出现时双主的情景，自动将错误的转成从");
                        return;
                    }
                    rcd.heartbeat = now;
                    rcd.heartbeats++;
                    Set(make_tuple(ClusterRecord, this.dbid), "master", rcd);
                }
                else {
                    // master 没有在 2 倍的 ttl 内响应，则代表超时
                    if (now - rcd.heartbeat > (ttl + ttl)) {
                        // 尝试自举一次，避免其他检查器同时自举
                        // votes增加超时，避免异常导致无限等待选举
                        redis.acquirelock("cluster.votes", ttl, suc => {
                            if (!suc)
                                return;
                            redis.releaselock("cluster.master", true, () => {
                                redis.acquirelock("cluster.master", 0, suc => {
                                    redis.releaselock("cluster.votes", true);
                                    if (!suc)
                                        return;
                                    this.doBecomeMaster(suc);
                                });
                            });
                        });
                    }
                }
            });
        });
    }

    dbid: string;
    private info: ClusterRecord;

    private doBecomeMaster(suc: boolean) {
        if (this.isMaster)
            return; // 已经是master，这种情况目前只有在通过admin接口强制设置时才会出现

        this.isMaster = suc;
        if (!suc)
            return;

        this.signals.emit(kSignalBecomeMaster);
        logger.log("{{=it.pid}} 成为 MASTER", process);

        // 纪录到数据中
        this.info = new ClusterRecord();
        this.info.heartbeat = this.info.time;
        Set(make_tuple(ClusterRecord, this.dbid), "master", this.info);
    }

    // 强行设置当前为master
    forceMaster() {
        this.doBecomeMaster(true);
    }

    isMaster: boolean;
    private _listening: boolean;
}

let _votes = new _ClusterVotes();

// 集群之间内部消息的处理

export class Server {

    constructor(mqsrv: string) {
        this._mqsrv = mqsrv;
    }

    private _mqsrv: string;
    private _idr = UUID();
    private _mq: IMQClient;
    private _process = new Map<number, (msg: Message) => void>();

    async subscribe(type: number, proc: (msg: Message) => void) {
        if (!this._mq) {
            this._mq = await Acquire(this._mqsrv).open("server." + this._idr, {
                durable: false,
                longliving: false
            });
            this._mq.receiver("nnt.cluster", true);
            this._mq.subscribe(data => {
                let msg = new Message();
                Decode(msg, data.toJsObj());
                let proc = this._process.get(msg.type);
                if (proc)
                    proc(msg);
            });
        }

        this._process.set(type, proc);
    }

    unsubscribe(type?: number) {
        if (this._mq) {
            this._mq.unsubscribe();
            this._mq.close();
            this._mq = null;
        }
        this._process.clear();
    }

    post(type: number, payload?: IndexedObject) {
        let msg = new Message();
        msg.type = type;
        msg.payload = payload;
        msg.fromi = mid_make(this._idr, DOMAIN_CLUSTERS);
        msg.toi = mid_make("", DOMAIN_CLUSTERS);
        msg.online = true;
        Acquire(this._mqsrv).open("nnt.cluster", {passive: true}).then(mq => {
            mq.broadcast(new Variant(Output(msg)));
        });
    }
}

export class Worker {

    constructor(mqsrv: string, chann: string) {
        this._mqsrv = mqsrv;
        this._chann = chann;
    }

    private _mqsrv: string;
    private _chann: string;
    private _mq: IMQClient;

    async open() {
        if (this._mq)
            return;
        this._mq = await Acquire(this._mqsrv).open(this._chann, {
            durable: true,
            longliving: true
        });
    }

    close() {
        if (this._mq) {
            this._mq.close();
            this._mq = null;
        }
    }
}