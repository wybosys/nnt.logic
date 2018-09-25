import {Transaction, TransactionSubmitOption} from "../transaction";
import {AbstractRender} from "./render";

export class Raw extends AbstractRender {

    type = "text/plain";

    render(trans: Transaction, opt?: TransactionSubmitOption): string {
        return trans.model.toString();
    }
}