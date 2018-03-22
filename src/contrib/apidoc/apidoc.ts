import {VueSite} from "../../nnt/server/vuesite";
import {Node} from "../../nnt/config/config";
import {static_cast} from "../../nnt/core/core";
import {IndexedObject} from "../../nnt/core/kernel";
import {expand, RegisterScheme} from "../../nnt/core/url";

interface ApiDocConfig {
    host: string;
    wshost: string;
}

export class ApiDoc extends VueSite {

    config(cfg: Node): boolean {
        if (!super.config(cfg))
            return false;
        let c = static_cast<ApiDocConfig>(cfg);
        if (!c.host || !c.wshost)
            return false;
        this.apidoc.host = c.host;
        this.apidoc.wshost = c.wshost;
        return true;
    }

    apidoc: IndexedObject = {};

    async start(): Promise<void> {
        await super.start();
        this._app.get("/apidoc.js", (req, rsp) => {
            let ct: IndexedObject = {'Content-Type': 'application/javascript'};
            rsp.writeHead(200, ct)
            rsp.end("apidoc = " + JSON.stringify(this.apidoc));
        });
    }
}

RegisterScheme("apidoc", body =>
    expand("~/src/contrib/apidoc/") + body
);
