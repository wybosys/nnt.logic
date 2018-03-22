import {IRender} from "./render";
import {Transaction} from "../server/transaction";

export class Raw implements IRender {

    type = "text/plain";

    render(trans: Transaction): string {
        return trans.model.toString();
    }
}