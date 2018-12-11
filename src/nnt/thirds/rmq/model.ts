import {Base, HttpMethod, ModelError, ResponseData} from "../../session/model";
import {array, boolean, integer, model, output, string} from "../../core/proto";
import {AbstractParser} from "../../server/parser/parser";
import {STATUS} from "../../core/models";

@model()
export class RmqVHost {

    @string(1, [output])
    name: string;

    @boolean(2, [output])
    tracing: boolean;

    @integer(3, [output])
    messages: number;

    @integer(4, [output])
    messages_ready: number;

    @integer(5, [output])
    messages_unacknowledged: number;
}

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
            data.body = {
                data: {
                    result: data.body
                },
                code: 0
            };
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

    @array(1, RmqVHost, [output])
    result: RmqVHost[];
}

export class RmqConnections {

}

export class RmqChannels {

}

export class RmqQueues {

}

export class RmqConsumers {

}
