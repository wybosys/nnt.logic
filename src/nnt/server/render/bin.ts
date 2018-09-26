import {AbstractRender} from "./render";
import {Mime} from "../../core/file";
import {Transaction, TransactionSubmitOption} from "../transaction";
import {FieldOption, FP_KEY, string_t} from "../../core/proto";

export class Bin extends AbstractRender {

    type = Mime.Type("bin");

    render(trans: Transaction, opt?: TransactionSubmitOption): Buffer {
        let r: Buffer;
        return r;
    }
}