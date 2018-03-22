import {IRender} from "./render"
import {Transaction} from "../server/transaction";
import {Mime} from "../core/file";

export class Vue implements IRender {

    type = Mime.Type("html");

    render(trans: Transaction): string {
        return "";
    }
}

