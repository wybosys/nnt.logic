import {IRender} from "./render";
import {Transaction} from "../server/transaction";
import {Output} from "../core/proto";
import {IndexedObject} from "../core/kernel";
import {Mime} from "../core/file";

export class Json implements IRender {

    type = Mime.Type("json");

    render(trans: Transaction): string {
        let r: IndexedObject = {
            code: trans.status,
            data: Output(trans.model)
        };
        let cmid = trans.params["_cmid"];
        if (cmid != null)
            r["_cmid"] = cmid;
        let listen = trans.params["_listening"];
        if (listen != null)
            r["_listening"] = listen;
        return JSON.stringify(r);
    }
}
