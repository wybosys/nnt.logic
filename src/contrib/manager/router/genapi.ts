import {IsClass, Require} from "../../../nnt/core/core";
import {expand} from "../../../nnt/core/url";
import {logger} from "../../../nnt/core/logger";
import {FieldOption, FpToDecoDef, FpToTypeDef, IsModel, ModelOption, MP_KEY, OWNFP_KEY} from "../../../nnt/core/proto";
import {FindAction, GetAllActionNames} from "../../../nnt/core/router";
import {UpcaseFirst} from "../../../nnt/core/string";
import fs = require("fs");
import tpl = require("dustjs-linkedin");

export interface ApiCfg {
    model: string[]; // 模型目录
    router: string[]; // 路由目录
    out: string[]; // 输出目录
}

function Output(val: any): string {
    if (typeof val == "string")
        return '"' + val + '"';
    return val.toString();
}

export function GenApi(cfg: ApiCfg) {
    // 读取模板
    let params = {
        clazzes: new Array(),
        enums: new Array(),
        consts: new Array(),
        routers: new Array()
    };

    // 读取配置的数据模板
    cfg.model.forEach(e => {
        let path = expand(e);
        Require(path, clz => {
            if (!IsModel(clz)) {
                if (clz["name"])
                    logger.log("跳过生成 {{=it.clz}}", {clz: clz["name"]});
                return;
            }

            let name = clz["name"];
            let mp: ModelOption = clz[MP_KEY];
            if (mp.hidden)
                return;
            if (mp.enum) {
                let em = {
                    name: name,
                    defs: new Array()
                };
                params.enums.push(em);
                // 枚举得每一项定义都是静态的，所以可以直接遍历
                for (let key in clz) {
                    em.defs.push({
                        name: key,
                        value: clz[key]
                    })
                }
            }
            else if (mp.constant) {
                for (let key in clz) {
                    params.consts.push({
                        name: name.toUpperCase() + "_" + key.toUpperCase(),
                        value: Output(clz[key])
                    });
                }
            }
            else {
                // 判断是否有父类
                let clazz = {
                    name: name,
                    super: mp.parent ? mp.parent["name"] : "Model",
                    fields: new Array()
                };
                params.clazzes.push(clazz);
                // 构造临时对象来获得fields得信息
                let tmp = new clz();
                let fps = tmp[OWNFP_KEY];
                for (let fk in fps) {
                    let fp: FieldOption = fps[fk];
                    if (fp.id <= 0) {
                        logger.warn("Model的 Field 不能 <=0 {{=it.name}}", {name: name + "." + fk});
                        continue;
                    }
                    if (!fp.input && !fp.output)
                        continue;
                    let type = FpToTypeDef(fp);
                    let deco = FpToDecoDef(fp, "Model.");
                    clazz.fields.push({
                        name: fk,
                        type: type,
                        optional: fp.optional,
                        file: fp.file,
                        enum: fp.enum,
                        input: fp.input,
                        deco: deco
                    });
                }
            }
        });
    });
    // 读取路由模板
    let routers = new Array();
    cfg.router.forEach(e => {
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
            params.routers.push({
                name: UpcaseFirst(router.action) + UpcaseFirst(a),
                action: router.action + "." + a,
                type: "models." + ap.clazz["name"],
                comment: ap.comment
            });
        });
    });
    // 渲染
    let src = fs.readFileSync(expand("manager://model/apis.dust"), "utf8");
    let tplcfg = (<any>tpl).config;
    let old = tplcfg.whitespace;
    tplcfg.whitespace = true;
    let compiled = tpl.compile(src, "api-generator");
    tplcfg.whitespace = old;
    tpl.loadSource(compiled);
    tpl.render("api-generator", params, (err, out) => {
        if (err)
            out = err.toString();

        cfg.out.forEach(e => {
            let outfile = expand(e);
            fs.writeFileSync(outfile, out);
        });
    });

    // 输出统计
    logger.log("生成了 {{=it.cnt}} 个模型", {cnt: params.clazzes.length});
    logger.log("生成了 {{=it.cnt}} 个路由", {cnt: params.routers.length});
    logger.log("生成了 {{=it.cnt}} 个枚举", {cnt: params.enums.length});
    logger.log("生成了 {{=it.cnt}} 个常量", {cnt: params.consts.length});
}