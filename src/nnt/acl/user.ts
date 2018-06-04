import {colarray, colinteger, colstring, table} from "../store/proto";
import {integer_t} from "../core/proto";

@table("", "nnt_users")
export class AcUser {

    // 管理系统中的用户id
    @colinteger()
    uid: number;

    // 组id
    @colarray(integer_t)
    gid: number[];

    // 账号
    @colstring()
    account: string;
}