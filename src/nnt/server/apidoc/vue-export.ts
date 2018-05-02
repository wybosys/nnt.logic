import {Transaction} from "../transaction";
import {RouterConfig} from "./router";
import {IsClass, Require} from "../../core/core";
import {expand} from "../../core/url";
import {FindAction, GetAllActionNames} from "../../core/router";
import {RespFile} from "../file";
import {GetAllFields} from "../../core/proto";
import {ObjectT} from "../../core/kernel";
import {UpcaseFirst} from "../../core/string";
import fs = require("fs");
import tpl = require("dustjs-linkedin");

export class VueExport {

    constructor(cfg: RouterConfig) {
        this._cfg = cfg;
    }

    private _cfg: RouterConfig;

    process(trans: Transaction) {
        // 分析出的所有结构
        let clazzes = new Array();

        // 遍历所有接口，生成接口段
        let routers = new Array();
        this._cfg.export.router.forEach(e => {
            let path = expand(e);
            Require(path, t => {
                if (!IsClass(t))
                    return;
                routers.push(new t());
            });
        });
        routers.forEach((router) => {
            let as = GetAllActionNames(router);
            as.forEach(a => {
                let ap = FindAction(router, a);
                let inputs = new Array();
                let outputs = new Array();
                let fps = GetAllFields(new ap.clazz());
                ObjectT.Foreach(fps, (fp, name) => {
                    if (fp.input)
                        inputs.push({name: name});
                    if (fp.output)
                        outputs.push({name: name});
                });
                clazzes.push({
                    name: UpcaseFirst(router.action) + UpcaseFirst(a),
                    router: router.action,
                    action: a,
                    inputs: inputs,
                    outputs: outputs
                });
            });
        });

        // 渲染模板
        let apis = "~/src/nnt/server/apidoc/apis-vue.dust";
        let src = fs.readFileSync(expand(apis), "utf8");
        let tplcfg = (<any>tpl).config;
        let old = tplcfg.whitespace;
        tplcfg.whitespace = true;
        let compiled = tpl.compile(src, "api-generator");
        tplcfg.whitespace = old;
        tpl.loadSource(compiled);
        tpl.render("api-generator", {clazzes: clazzes}, (err, out) => {
            if (err)
                out = err.toString();

            // 输出到客户端
            trans.output('text/plain', RespFile.Plain(out).asDownload("apis.js"));
        });
    }
}