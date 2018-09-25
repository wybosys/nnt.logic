import {IRender} from "./render";
import {Transaction, TransactionSubmitOption} from "../transaction";
import {Mime} from "../../core/file";

export class Protobuf implements IRender {

    type = Mime.Type("text");

    render(trans: Transaction, opt?: TransactionSubmitOption): string {
        return "";
    }
}