import {Transaction, TransactionSubmitOption} from "../transaction";
import {AbstractRender} from "./render";

export class Raw implements AbstractRender {

    type = "text/plain";

    render(trans: Transaction, opt?: TransactionSubmitOption): string {
        return trans.model.toString();
    }
}