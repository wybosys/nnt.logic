import {action, IRouter} from "../../core/router";
import {Null, STATUS} from "../../core/models";
import {Transaction} from "../../server/transaction";
import {IndexedObject, ObjectT, toJson, toJsonObject} from "../../core/kernel";
import fs = require("fs");
import {expand} from "../../core/url";
import ph = require("path");
import {Call} from "../../manager/servers";
import {Mime} from "../../core/file";
import {Config} from "../../manager/config";
import {Rest} from "../../server/rest";

export class Ueditor implements IRouter {
    action = "ueditor";

    constructor() {
        let cfgstr = fs.readFileSync(expand("~/3rd/ueditor/config.json"), "utf8");
        // 删除注释
        cfgstr = cfgstr.replace(/\/\*[\s\S]+?\*\//g, "");
        this._cfg = toJsonObject(cfgstr);
    }

    private _cfg: IndexedObject;

    @action(Null)
    async call(trans: Transaction) {
        let params = trans.params;
        let jsonp = params["callback"];
        let func = (<IndexedObject>this)["_cmd_" + params["action"]];
        if (!func)
            trans.status = STATUS.ACTION_NOT_FOUND;
        else
            await func.call(this, trans, jsonp);
        trans.submit({model: true, raw: true, type: "text/html; charset=utf-8"});
    }

    protected async _cmd_config(trans: Transaction, jsonp: string) {
        let cfg = ObjectT.LightClone(this._cfg);
        // 修改成访问的地址
        let srv = <Rest>trans.server;
        // 获得访问的地址
        let urls = [
            srv.https ? "https://" : "http://",
            trans.info.host,
            trans.info.path,
            "?action=use&name="
        ];
        cfg.imageUrlPrefix = urls.join("");
        trans.model = jsonp ? jsonp + "(" + toJson(cfg) + ")" : cfg;
    }

    protected async _cmd_uploadimage(trans: Transaction, jsonp: string) {
        let file = trans.params.upfile;
        if (!file) {
            trans.status = STATUS.PARAMETER_NOT_MATCH;
            return;
        }
        // 传输到图片服务器
        let ret = await Call("media", "imagestore.upload", {
            file: file
        });
        if (ret.status) {
            trans.status = ret.status;
            return;
        }
        let path = ret.model.path;
        trans.model = {
            "state": "SUCCESS",
            "url": ret.model.path,
            "title": ph.basename(ret.model.path),
            "original": file.name,
            "type": '.' + Mime.Extension(file.type),
            "size": file.size
        };
    }

    protected async _cmd_use(trans: Transaction, jsonp: string) {
        let name = trans.params.name;
        let filter = trans.params.filter;
        let ret = await Call("media", "imagestore.use", {
            name: name,
            filter: filter
        });
        if (ret.status) {
            trans.status = ret.status;
            return;
        }
        let pl = ret.payload;
        trans.output(pl.type, pl);
    }
}