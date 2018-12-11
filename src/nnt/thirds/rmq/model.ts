import {Base, HttpMethod} from "../../session/model";
import {model} from "../../core/proto";

@model()
export class RmqModel extends Base {

    constructor() {
        super();
        this.method = HttpMethod.POST;
    }

    requestUrl(): string {
        return '';
    }

    user: string;
    password: string;
}

@model()
export class RmqVhosts extends RmqModel {

    requestUrl(): string {
        return "vhosts";
    }
}

export class RmqConnections {

}

export class RmqChannels {

}

export class RmqQueues {

}

export class RmqConsumers {

}
