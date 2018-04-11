import {IRender} from "./render";
import {Transaction, TransactionSubmitOption} from "../server/transaction";

export class Raw implements IRender {

    type = "text/plain";

    render(trans: Transaction, opt?: TransactionSubmitOption): string {
        return trans.model.toString();
    }
}