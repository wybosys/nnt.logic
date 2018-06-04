import {action, debug, develop, IRouter} from "../../../nnt/core/router";
import {Manager} from "../manager";
import {Null, STATUS} from "../../../nnt/core/models";
import {GenApi} from "./genapi";
import {GenConfig} from "./genconfig";
import {
    ADMIN_GID,
    MgrActionRecord,
    MgrActionRecordType,
    MgrAddUser,
    MgrInit,
    MgrLogin,
    MgrSid,
    MgrUser
} from "../model/manager";
import {AutoInc, Count, Insert, QueryOne, Set} from "../../../nnt/manager/dbmss";
import {AcUser} from "../../../nnt/acl/user";
import {make_tuple, Self} from "../../../nnt/core/kernel";
import {admin, Trans} from "../trans";
import {GEN_SID} from "../../../nnt/component/account";
import {GenDbXls} from "./gendbxls";

export class RManager implements IRouter {
    action = "manager";

    constructor(mgr: Manager) {
        this._mgr = mgr;
    }

    @action(MgrInit, [], "初始化管理系统")
    async init(trans: Trans) {
        let cnt = await Count(make_tuple(this._mgr.dbsrv, AcUser), {});
        if (cnt != 0) {
            trans.status = STATUS.TARGET_EXISTS;
            trans.submit();
            return;
        }

        let m: MgrInit = trans.model;
        m.gid = [ADMIN_GID];
        m.uid = await AutoInc(make_tuple(this._mgr.dbsrv, AcUser), "uid");
        await Insert(make_tuple(this._mgr.dbsrv, AcUser), m);

        trans.submit();
    }

    @action(MgrLogin, [], "登陆管理员")
    async login(trans: Trans) {
        let m: MgrLogin = trans.model;

        // 已经使用sid登陆
        if (!m.account || !m.password) {
            if (trans.auth()) {
                m.sid = trans.sessionId();
                trans.submit();

                // 纪录
                Insert(make_tuple(this._mgr.dbsrv, MgrActionRecord), Self(new MgrActionRecord(), t => {
                    t.type = MgrActionRecordType.LOGIN;
                    t.uid = trans.current.uid;
                }));
                return;
            }
            else {
                // 失败登陆的纪录
                Insert(make_tuple(this._mgr.dbsrv, MgrActionRecord), Self(new MgrActionRecord(), t => {
                    t.type = MgrActionRecordType.LOGIN;
                    t.payload = trans.info;
                }));

                trans.status = STATUS.PARAMETER_NOT_MATCH;
                trans.submit();
                return;
            }
        }

        // 使用用户密码登陆
        let fnd = await QueryOne(make_tuple(this._mgr.dbsrv, AcUser), {
            account: m.account,
            password: m.password
        });
        if (!fnd) {
            // 失败登陆的纪录
            Insert(make_tuple(this._mgr.dbsrv, MgrActionRecord), Self(new MgrActionRecord(), t => {
                t.type = MgrActionRecordType.LOGIN;
                t.payload = trans.info;
            }));

            trans.status = STATUS.TARGET_NOT_FOUND;
            trans.submit();
            return;
        }

        // 生成新得SID
        m.sid = GEN_SID();
        await Set(make_tuple(this._mgr.mcsrv, MgrSid), m.sid, Self(new MgrSid(), t => {
            t.uid = fnd.uid;
            t.sid = m.sid;
        }));

        // 纪录
        Insert(make_tuple(this._mgr.dbsrv, MgrActionRecord), Self(new MgrActionRecord(), t => {
            t.type = MgrActionRecordType.LOGIN;
            t.uid = fnd.uid;
        }));

        trans.submit();
    }

    @action(MgrAddUser, [admin], "添加用户")
    async adduser(trans: Trans) {
        let m: MgrAddUser = trans.model;
        let cur = trans.current;
        if (cur.gid.indexOf(ADMIN_GID) == -1) {
            trans.status = STATUS.PERMISSIO_FAILED;
            trans.submit();
            return;
        }

        let fnd = await QueryOne(make_tuple(this._mgr.dbsrv, AcUser), {account: m.account});
        if (fnd) {
            trans.status = STATUS.TARGET_EXISTS;
            trans.submit();
            return;
        }

        let ui = new MgrUser();
        ui.gid = [m.gid];
        ui.uid = await AutoInc(make_tuple(this._mgr.dbsrv, AcUser), "uid");
        ui.account = m.account;
        ui.password = m.password;
        await Insert(make_tuple(this._mgr.dbsrv, AcUser), ui);

        // 纪录
        Insert(make_tuple(this._mgr.dbsrv, MgrActionRecord), Self(new MgrActionRecord(), t => {
            t.type = MgrActionRecordType.ADD_USER;
            t.uid = trans.current.uid;
            t.payload = {
                who: cur.uid,
                target: t.uid
            }
        }));

        trans.submit();
    }

    @action(Null, [debug, develop], "更新api")
    genapi(trans: Trans) {
        if (this._mgr.genapi) {
            this._mgr.genapi.forEach(e => {
                GenApi(e);
            });
        }

        Insert(make_tuple(this._mgr.dbsrv, MgrActionRecord), Self(new MgrActionRecord(), t => {
            t.type = MgrActionRecordType.GEN_API;
        }));

        trans.submit();
    }

    @action(Null, [debug, develop], "更新配表")
    genconfig(trans: Trans) {
        if (this._mgr.gencfg) {
            this._mgr.gencfg.forEach(e => {
                GenConfig(e);
            });
        }

        Insert(make_tuple(this._mgr.dbsrv, MgrActionRecord), Self(new MgrActionRecord(), t => {
            t.type = MgrActionRecordType.GEN_CONFIGS;
        }));

        trans.submit();
    }

    @action(Null, [debug, develop], "更新数据库字典")
    gendbxls(trans: Trans) {
        if (this._mgr.gendb) {
            this._mgr.gendb.forEach(e => {
                GenDbXls(e);
            });
        }

        Insert(make_tuple(this._mgr.dbsrv, MgrActionRecord), Self(new MgrActionRecord(), t => {
            t.type = MgrActionRecordType.GEN_DBXLS;
        }));

        trans.submit();
    }

    private _mgr: Manager;
}
