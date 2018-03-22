import {IRender} from "./render";
import {Transaction} from "../server/transaction";
import {Mime} from "../core/file";

export class Protobuf implements IRender {

    type = Mime.Type("text");

    render(trans: Transaction): string {
        return "";
    }
}