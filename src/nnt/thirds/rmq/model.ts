import {Base, HttpMethod, ModelError, ResponseData} from "../../session/model";
import {model} from "../../core/proto";
import {AbstractParser} from "../../server/parser/parser";
import {STATUS} from "../../core/models";

@model()
export class RmqModel extends Base {

    constructor() {
        super();
        this.method = HttpMethod.GET;
    }

    requestUrl(): string {
        return this.host + this.api;
    }

    parseData(data: ResponseData, parser: AbstractParser, suc: () => void, error: (err: ModelError) => void) {
        if (data.code == 200) {
            data.code = 0;
        } else {
            data.code = STATUS.THIRD_FAILED;
        }
        super.parseData(data, parser, suc, error);
    }

    api: string;
}

@model()
export class RmqVhosts extends RmqModel {

    api = 'vhosts';
}

export class RmqConnections {

}

export class RmqChannels {

}

export class RmqQueues {

}

export class RmqConsumers {

}