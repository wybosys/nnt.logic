import {auth, input, integer, model, optional, output, string} from "../../../nnt/core/proto";
import {AcUser} from "../../../nnt/acl/user";
import {colinteger, coljson, colstring, table} from "../../../nnt/store/proto";
import {IndexedObject} from "../../../nnt/core/kernel";
import {DateTime} from "../../../nnt/core/time";

export const ADMIN_GID = 0;
export const USER_GID = 1;

export class MgrUser extends AcUser {

    @colstring()
    password: string;
}

@model()
export class MgrInit extends MgrUser {

    @string(1, [input])
    account: string;

    @string(2, [input])
    password: string;
}

@model()
export class MgrLogin extends MgrUser {

    @string(1, [input, optional])
    account: string;

    @string(2, [input, optional])
    password: string;

    @string(3, [output])
    sid: string;
}

@table("", "mgr_sid", {ttl: 300})
export class MgrSid {

    @colinteger()
    uid: number;

    @colstring()
    sid: string;
}

@model([auth])
export class MgrAddUser {

    @string(1, [input])
    account: string;

    @string(2, [input])
    password: string;

    @integer(3, [input, optional])
    gid: number = USER_GID;
}

export enum MgrActionRecordType {
    LOGIN = 0,
    ADD_USER = 1,
    GEN_API = 2,
    GEN_CONFIGS = 3,
    GEN_DB = 4,
    GEN_DBXLS = 5
}

@table("", "mgr_action_records")
export class MgrActionRecord {

    @colinteger()
    type: MgrActionRecordType;

    @colinteger()
    uid: number;

    @coljson()
    payload: IndexedObject;

    @colinteger()
    time = DateTime.Now();
}