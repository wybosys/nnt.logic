import {Base, HttpMethod, ModelError, RequestParams, ResponseData} from "../../session/model";
import {array, boolean, GetAllFields, input, integer, model, optional, output, string} from "../../core/proto";
import {AbstractParser} from "../../server/parser/parser";
import {STATUS} from "../../core/models";
import {AnyClass} from "../../core/kernel";

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
export class RmqConnection {

    @integer(1, [output])
    channels: number;

    @integer(2, [output])
    channel_max: number;

    @string(3, [output])
    host: string;

    @string(4, [output])
    name: string;

    @string(5, [output])
    node: string;

    @string(6, [output])
    state: string;
}

@model()
export class RmqChannel {

    @integer(1, [output])
    acks_uncommitted: number;

    @integer(2, [output])
    consumer_count: number;

    @integer(3, [output])
    messages_unacknowledged: number;

    @integer(4, [output])
    messages_uncommitted: number;
}

@model()
export class RmqModel extends Base {

    constructor() {
        super();
        this.method = HttpMethod.GET;
    }

    requestUrl(): string {
        let r = this.host;
        if (this.vhost)
            r += '/vhosts/' + this.vhost;
        r += '/' + this.api;
        return r;
    }

    requestParams(): RequestParams {
        let r = new RequestParams();
        // 获取所有用来输出的
        let fps = GetAllFields(this);
        let fp = fps['result'];
        fps = GetAllFields((<AnyClass>fp.valtype).prototype);
        let columns = [];
        for (let key in fps) {
            let fp = fps[key];
            if (fp.output) {
                columns.push(key);
            }
        }
        if (columns)
            r.fields['columns'] = columns.join(',');
        return r;
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

    @string(1, [input, optional])
    vhost: string;
}

@model()
export class RmqVhosts extends RmqModel {

    api = 'vhosts';

    @array(1, RmqVHost, [output])
    result: RmqVHost[];
}

@model([], RmqModel)
export class RmqConnections extends RmqModel {

    api = 'connections';

    @array(1, RmqConnection, [output])
    result: RmqConnection[];
}

@model([], RmqModel)
export class RmqChannels extends RmqModel {

    api = 'channels';

    @array(1, RmqChannel, [output])
    result: RmqChannel[];
}

export class RmqQueues {

}

export class RmqConsumers {

}
