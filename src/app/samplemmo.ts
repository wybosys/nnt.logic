import {Connector, Multiplayers} from "../nnt/server/multiplayers";
import {Trans} from "./model/trans";
import {Manager} from "./manager/manager";
import {RSample} from "./router/sample";

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
        this.routers.register(new RSample());
    }

    instanceTransaction(): Trans {
        return new Trans();
    }

    instanceConnector(): MmoConnector {
        return new MmoConnector();
    }

    protected async onConnectorAvaliable(connector: MmoConnector) {
        await super.onConnectorAvaliable(connector);
        Manager.shared().user.startMessageBomb(connector.userIdentifier);
    }

    protected async onConnectorUnavaliable(connector: MmoConnector) {
        await super.onConnectorUnavaliable(connector);
        if (connector.isSumdClosing)
            return;
        Manager.shared().user.stopMessageBomb(connector.userIdentifier);
    }
}
