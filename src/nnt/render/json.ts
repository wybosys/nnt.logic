import {IRender} from "./render";
import {Transaction, TransactionSubmitOption} from "../server/transaction";
import {Output} from "../core/proto";
import {asString, IndexedObject} from "../core/kernel";
import {Mime} from "../core/file";

export class Json implements IRender {

    type = Mime.Type("json");

    render(trans: Transaction, opt?: TransactionSubmitOption): string {
        let r: IndexedObject;
        if (opt && opt.model) {
            if (opt.raw)
                return asString(trans.model);
            r = Output(trans.model);
        }
        else {
            r = {
                code: trans.status,
                data: (opt && opt.raw) ? trans.model : Output(trans.model)
            };
        }
        let cmid = trans.params["_cmid"];
        if (cmid != null)
            r["_cmid"] = cmid;
        let listen = trans.params["_listening"];
        if (listen != null)
            r["_listening"] = listen;
        return JSON.stringify(r);
    }
}
