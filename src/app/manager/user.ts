import {CancelRepeat, Repeat, RepeatHandler} from "../../nnt/core/time";
import {logger} from "../../nnt/core/logger";
import {Message} from "../model/sample";
import {Acquire} from "../../nnt/server/mq";
import {Multiplayers, Transaction} from "../../nnt/server/multiplayers";

export class User {

    // 测试时当用户长联后，开始消息轰炸
    startMessageBomb(uid: string) {
        let fnd = this._msgbombs.get(uid);
        if (fnd != null) {
            logger.fatal("已经开始轰炸");
            return;
        }
        let mb = new MessageBomb(uid);
        this._msgbombs.set(uid, mb);
    }

    stopMessageBomb(uid: string) {
        let fnd = this._msgbombs.get(uid);
        if (fnd) {
            fnd.stop();
            this._msgbombs.delete(uid);
        }
    }

    private _msgbombs = new Map<string, MessageBomb>();
}

class MessageBomb {

    constructor(uid: string) {
        this._uid = uid;
        this._timer = Repeat(1, () => {
            this.send();
        });
    }

    protected send() {
        let msg = new Message();
        msg.content = "CURRENT MESSAGE INDEX IS " + this._idx++;
        Multiplayers.AcquireOnlineUser("amqp", this._uid).then(mq => {
            mq.produce(Transaction.Encode(msg));
        });
    }

    stop() {
        if (this._timer) {
            CancelRepeat(this._timer);
            this._timer = null;
        }
    }

    private _uid: string;
    private _idx: number = 0;
    private _timer: RepeatHandler = null;
}
