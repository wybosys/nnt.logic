import {Transaction, TransactionSubmitOption} from "../transaction";
import {Output} from "../../core/proto";
import {asString, IndexedObject} from "../../core/kernel";
import {Mime} from "../../core/file";
import {AbstractRender} from "./render";
import {STATUS} from "../../core/models";

export class Json extends AbstractRender {

    type = Mime.Type("json");

    render(trans: Transaction, opt?: TransactionSubmitOption): Buffer {
        let r: IndexedObject;
        if (opt && opt.model) {
            if (opt.raw) {
                let str = asString(trans.model);
                return new Buffer(str, 'utf8');
            }
            r = Output(trans.model);
            if (trans.model && r === null)
                r = {};
        } else {
            r = {
                code: trans.status,
            };
            if (trans.status != STATUS.OK) {
                r.message = trans.message;
            } else {
                r.data = (opt && opt.raw) ? trans.model : Output(trans.model);
                if (r.data === null && trans.model)
                    r.data = {};
            }
        }
        let cmid = trans.params["_cmid"];
        if (cmid != null)
            r["_cmid"] = cmid;
        let listen = trans.params["_listening"];
        if (listen != null)
            r["_listening"] = listen;
        let str = JSON.stringify(r);
        return new Buffer(str, 'utf8');
    }
}
