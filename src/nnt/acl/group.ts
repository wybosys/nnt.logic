import {colinteger, colstring, table} from "../store/proto";

@table("", "nnt_groups")
export class AcGroup {

    // 组ID
    @colinteger()
    id: number;

    // 组名
    @colstring()
    name: string;
}