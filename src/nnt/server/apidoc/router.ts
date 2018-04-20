import {action, IRouter} from "../../core/router";
import {Null} from "../../core/models";
import {Transaction} from "../transaction";
import {IRouterable} from "../routers";
import {static_cast} from "../../core/core";
import {length} from "../../core/kernel";
import {expand} from "../../core/url";
import {Template} from "../../component/template";
import fs = require("fs");

export class Router implements IRouter {
    action = "api";

    constructor() {
        this._page.compile(fs.readFileSync(expand("~/src/nnt/server/apidoc/apidoc.volt"), "utf8"));
    }

    private _page = new Template();

    @action(Null, [], "文档")
    doc(trans: Transaction) {
        let srv = static_cast<IRouterable>(trans.server);
        if (length(srv.routers)) {
            // 收集routers的信息
            // 渲染页面
            trans.output('text/html', this._page.render({router: '"FDSFSDF"'}));
        }
        trans.submit();
    }
}