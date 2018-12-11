import {Base, HttpContentType, HttpMethod, ModelError, RequestParams, ResponseData} from "../../session/model";
import {
    array,
    auth,
    boolean, Encode,
    GetAllFields,
    input,
    integer,
    model,
    optional,
    output,
    string,
    type
} from "../../core/proto";
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
export class RmqQueue {

    @integer(1, [output])
    consumers: number;

    @boolean(2, [output])
    auto_delete: boolean;

    @boolean(3, [output])
    durable: boolean;

    @boolean(4, [output])
    exclusive: boolean;

    @integer(5, [output])
    messages: number;

    @integer(6, [output])
    messages_ready: number;

    @integer(7, [output])
    messages_unacknowledged: number;

    @string(8, [output])
    name: string;

    @string(9, [output])
    state: string;
}

@model()
export class RmqConsumer {

    @string(1, [output])
    consumer_tag: string;

    @type(2, RmqQueue, [output])
    queue: RmqQueue;
}

@model()
export class RmqExchange {

    @boolean(1, [output])
    auto_delete: boolean;

    @boolean(2, [output])
    durable: boolean;

    @boolean(3, [output])
    internal: boolean;

    @string(4, [output])
    type: string;

    @string(5, [output])
    name: string;
}

@model()
export class RmqModel extends Base {

    constructor() {
        super();
        this.method = HttpMethod.GET;
        this.logic = false;
    }

    requestParams(): RequestParams {
        let r = new RequestParams();

        // 获取所有用来输出的
        let fps = GetAllFields(this);
        let fp = fps['result'];
        if (fp) {
            fps = GetAllFields((<AnyClass>fp.valtype).prototype);
            let columns = [];
            for (let key in fps) {
                let fp = fps[key];
                if (fp.output) {
                    columns.push(key);
                }
            }
            if (columns.length)
                r.fields['columns'] = columns.join(',');
        }

        return r;
    }

    parseData(data: ResponseData, parser: AbstractParser, suc: () => void, error: (err: ModelError) => void) {
        data.body = {
            data: {
                result: data.body
            },
            code: 0
        };
        super.parseData(data, parser, suc, error);
    }

    requestUrl(): string {
        let t = Encode(this);
        let p = [];
        for (let k in t) {
            if (k == 'vhost')
                continue;
            p.push(encodeURIComponent(t[k]));
        }
        return p.join('/');
    }

    // 当前模型使用的api
    api: string;

    @string(1, [input, optional])
    vhost: string;
}

@model([], RmqModel)
export class RmqVHostModel extends RmqModel {

    requestUrl(): string {
        let r = this.host;
        if (this.vhost)
            r += '/vhosts/' + this.vhost;
        r += '/' + this.api;
        let suf = super.requestUrl();
        if (suf.length)
            r += '/' + suf;
        return r;
    }
}

@model([], RmqModel)
export class RmqQueueModel extends RmqModel {

    requestUrl(): string {
        let r = this.host;
        r += '/queues';
        if (this.vhost)
            r += '/' + this.vhost;
        if (this.api)
            r += '/' + this.api;
        let suf = super.requestUrl();
        if (suf.length)
            r += '/' + suf;
        return r;
    }
}

@model([], RmqModel)
export class RmqConsumerModel extends RmqModel {

    requestUrl(): string {
        let r = this.host;
        r += '/consumers';
        if (this.vhost)
            r += '/' + this.vhost;
        if (this.api)
            r += '/' + this.api;
        let suf = super.requestUrl();
        if (suf.length)
            r += '/' + suf;
        return r;
    }
}

@model([], RmqModel)
export class RmqExchangeModel extends RmqModel {

    requestUrl(): string {
        let r = this.host;
        r += '/exchanges';
        if (this.vhost)
            r += '/' + this.vhost;
        if (this.api)
            r += '/' + this.api;
        let suf = super.requestUrl();
        if (suf.length)
            r += '/' + suf;
        return r;
    }
}

@model([auth])
export class RmqVhosts extends RmqVHostModel {

    api = 'vhosts';

    @array(1, RmqVHost, [output])
    result: RmqVHost[];
}

@model([auth], RmqVHostModel)
export class RmqConnections extends RmqVHostModel {

    api = 'connections';

    @array(1, RmqConnection, [output])
    result: RmqConnection[];
}

@model([auth], RmqVHostModel)
export class RmqChannels extends RmqVHostModel {

    api = 'channels';

    @array(1, RmqChannel, [output])
    result: RmqChannel[];
}

@model([auth], RmqQueueModel)
export class RmqQueues extends RmqQueueModel {

    api = '';

    @array(1, RmqQueue, [output])
    result: RmqQueue[];
}

@model([auth], RmqConsumerModel)
export class RmqConsumers extends RmqConsumerModel {

    api = '';

    @array(1, RmqConsumer, [output])
    result: RmqConsumer[];
}

@model([auth], RmqExchangeModel)
export class RmqExchanges extends RmqExchangeModel {

    api = '';

    @array(1, RmqExchange, [output])
    result: RmqExchange[];
}


@model([], RmqQueueModel)
export class RmqDeleteQueue extends RmqQueueModel {

    api = '';
    method = HttpMethod.DELETE;
    responseType = HttpContentType.MANUAL;

    @string(1, [input])
    name: string;
}
