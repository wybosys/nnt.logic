import {Connector, Multiplayers} from "../nnt/server/multiplayers";
import {Trans} from "./model/trans";

export class MmoConnector extends Connector {

    // 用长连接验证过得用户数据填充trans模型，避免重复验证
    init(trans: Trans): boolean {
        super.init(trans);
        trans.sid = this.sessionId;
        trans.uid = this.userIdentifier;
        return true;
    }
}

export class SampleMmo extends Multiplayers {

    constructor() {
        super();
    }

    instanceTransaction(): Trans {
        return new Trans();
    }

    instanceConnector(): MmoConnector {
        return new MmoConnector();
    }

    protected onConnectorAvaliable(connector: MmoConnector) {
        super.onConnectorAvaliable(connector);
    }

    protected onConnectorUnavaliable(connector: MmoConnector) {
        super.onConnectorUnavaliable(connector);
    }
}
