import {Transaction} from "../../nnt/server/multiplayers";
import {Login} from "./sample";
import {Get} from "../../nnt/manager/dbmss";

export class Trans extends Transaction {

    uid: string;
    sid: string;

    async collect() {
        this.sid = this.params['_sid'];
        let fnd = await Get(Login, {sid: this.sid});
        if (fnd) {
            this.uid = fnd.uid;
        }
    }

    auth(): boolean {
        return this.uid != null && this.sid != null;
    }

    userIdentifier(): string {
        return this.uid;
    }

    sessionId(): string {
        return this.sid;
    }
}
