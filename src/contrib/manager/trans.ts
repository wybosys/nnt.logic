import {Transaction} from "../../nnt/server/transaction";
import {AcUser} from "../../nnt/acl/user";
import {Get, QueryOne, Set} from "../../nnt/manager/dbmss";
import {make_tuple} from "../../nnt/core/kernel";
import {Manager} from "./manager";
import {ADMIN_GID, MgrSid} from "./model/manager";
import {FindAction, IRouter} from "../../nnt/core/router";
import {STATUS} from "../../nnt/sdk/client/src/status";
import {static_cast} from "../../nnt/core/core";

export const admin = "admin";

interface MgrActionProto {
    admin: boolean;
}

export class Trans extends Transaction {

    sid: string;
    current: AcUser;
    admin: boolean; // 需要admin登陆

    async collect() {
        this.sid = this.params["_sid"];
        if (this.sid) {
            let srv = <Manager>this.server;
            let rcd = await Get(make_tuple(srv.mcsrv, MgrSid), this.sid);
            if (rcd) {
                this.current = await QueryOne(make_tuple(srv.dbsrv, AcUser), {id: rcd.uid});
                if (this.current) {
                    // 续约
                    await Set(make_tuple(srv.mcsrv, MgrSid), this.sid, rcd);
                }
            }
        }
    }

    auth(): boolean {
        if (!this.current)
            return false;

        if (this.admin) {
            if (this.current.gid.indexOf(ADMIN_GID) == -1)
                return false;
        }

        return true;
    }

    sessionId(): string {
        return this.sid;
    }

    modelize(r: IRouter): number {
        let st = super.modelize(r);
        if (st != STATUS.OK)
            return st;
        let ap = static_cast<MgrActionProto>(FindAction(r, this.call));
        this.admin = ap.admin;
        return st;
    }
}