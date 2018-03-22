import {VueSite} from "../../nnt/server/vuesite";
import {Node} from "../../nnt/config/config";
import {static_cast} from "../../nnt/core/core";
import {IndexedObject} from "../../nnt/core/kernel";

interface PortalCfg {
    host: string;
}

export class Portal extends VueSite {

    config(cfg: Node): boolean {
        if (!super.config(cfg))
            return false;
        let c = static_cast<PortalCfg>(cfg);
        this.host = c.host;
        return true;
    }

    host: string;

    async start(): Promise<void> {
        await super.start();
        this._app.get("/config.js", (req, rsp) => {
            let ct: IndexedObject = {'Content-Type': 'application/javascript'};
            rsp.writeHead(200, ct)
            rsp.end("apicfg = " + JSON.stringify({host: this.host}));
        });
    }
}