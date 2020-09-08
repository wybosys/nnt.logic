import {action, IRouter} from "../../core/router";
import {Null, STATUS} from "../../core/models";
import {Transaction} from "../../server/transaction";
import {IndexedObject, toJsonObject} from "../../core/kernel";
import {expand} from "../../core/url";
import {Call} from "../../manager/servers";
import {Mime} from "../../core/file";
import fs = require("fs");
import ph = require("path");

// 带图床的ueditor服务

export class Ueditor implements IRouter {
    action = "ueditor";

    constructor() {
        let cfgstr = fs.readFileSync(expand("~/3rd/ueditor/config.json"), "utf8");
        // 删除注释
        cfgstr = cfgstr.replace(/\/\*[\s\S]+?\*\//g, "");
        this._cfg = toJsonObject(cfgstr);
        this._cfgstr = cfgstr;
    }

    private _cfg: IndexedObject;
    private _cfgstr: string;

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
        trans.model = jsonp ? jsonp + "(" + this._cfgstr + ")" : this._cfg;
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