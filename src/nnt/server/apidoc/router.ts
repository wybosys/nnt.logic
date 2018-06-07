import {action, FindAction, GetAllActionNames, IRouter} from "../../core/router";
import {Null, STATUS} from "../../core/models";
import {Transaction} from "../transaction";
import {IRouterable, Routers} from "../routers";
import {IsClass, Require, static_cast} from "../../core/core";
import {AnyClass, ArrayT, IndexedObject, JsonObject, ObjectT, toJson} from "../../core/kernel";
import {expand} from "../../core/url";
import {Template} from "../../component/template";
import {
    boolean,
    FpToDecoDef,
    FpToTypeDef,
    GetAllFields,
    GetAllOwnFields,
    GetModelInfo,
    input,
    IsModel,
    optional,
    Output
} from "../../core/proto";
import {logger} from "../../core/logger";
import {UpcaseFirst} from "../../core/string";
import {RespFile} from "../file";
import {clazz_type} from "../../sdk/client/src/model";
import {VueExport} from "./vue-export";
import fs = require("fs");
import tpl = require("dustjs-linkedin");

interface ParameterInfo {
    name: string;
    string: boolean;
    integer: boolean;
    double: boolean;
    boolean: boolean;
    file: boolean;
    enum: boolean;
    array: boolean;
    map: boolean;
    object: boolean;
    optional: boolean;
    index: number;
    input: boolean;
    output: boolean;
    comment: string;
    valtyp: clazz_type | string;
    keytyp: clazz_type | string;
}

interface ActionInfo {
    name: string;
    action: string;
    comment: string;
    params: ParameterInfo[];
}

export interface RouterConfig {
    export: {
        router: string[],
        model: string[]
    }
}

class ExportApis {

    @boolean(1, [input, optional], "生成logic客户端使用的api")
    logic: boolean;

    @boolean(2, [input, optional], "生成h5g游戏使用api")
    h5g: boolean;

    @boolean(3, [input, optional], "生成vue项目中使用的api")
    vue: boolean;
}

export class Router implements IRouter {
    action = "api";

    constructor() {
        this._page.compile(fs.readFileSync(expand("~/src/nnt/server/apidoc/apidoc.volt"), "utf8"));
    }

    private _page = new Template();

    @action(Null, [], "文档")
    doc(trans: Transaction) {
        let srv = static_cast<IRouterable>(trans.server);
        if (srv.routers.length) {
            // 收集routers的信息
            let infos = Router.ActionsInfo(srv.routers);
            // 渲染页面
            trans.output('text/html;charset=utf-8;', this._page.render({actions: toJson(infos)}));
            return;
        }
        trans.submit();
    }

    @action(ExportApis, [], "生成api接口文件")
    export(trans: Transaction) {
        let m: ExportApis = trans.model;
        if (!m.logic && !m.h5g && !m.vue) {
            trans.status = STATUS.PARAMETER_NOT_MATCH;
            trans.submit();
            return;
        }

        if (m.vue) {
            // vue的生成模型由 296963166@qq.com 维护
            new VueExport(this._cfg).process(trans);
            return;
        }

        // 分析出的所有结构
        let params = {
            clazzes: new Array(),
            enums: new Array(),
            consts: new Array(),
            routers: new Array()
        };

        // 遍历所有模型，生成模型段
        this._cfg.export.model.forEach(each => {
            Require(expand(each), clz => {
                if (!IsModel(clz)) {
                    if (clz["name"])
                        logger.log("跳过生成 {{=it.clz}}", {clz: clz["name"]});
                    return;
                }

                let name = clz["name"];
                let mp = GetModelInfo(clz);
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
                    let fps = GetAllOwnFields(tmp);
                    ObjectT.Foreach(fps, (fp, key) => {
                        if (fp.id <= 0) {
                            logger.warn("Model的 Field 不能 <=0 {{=it.name}}", {name: name + "." + key});
                            return;
                        }
                        if (!fp.input && !fp.output)
                            return;
                        let type = FpToTypeDef(fp);
                        let deco = FpToDecoDef(fp, "Model.");
                        clazz.fields.push({
                            name: key,
                            type: type,
                            optional: fp.optional,
                            file: fp.file,
                            enum: fp.enum,
                            input: fp.input,
                            deco: deco
                        });
                    });
                }
            });
        });
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
                params.routers.push({
                    name: UpcaseFirst(router.action) + UpcaseFirst(a),
                    action: router.action + "." + a,
                    type: "models." + ap.clazz["name"],
                    comment: ap.comment
                });
            });
        });
        // 渲染模板
        let apis: string;
        if (m.logic)
            apis = "~/src/nnt/server/apidoc/apis-logic.dust";
        else if (m.h5g)
            apis = "~/src/nnt/server/apidoc/apis-h5g.dust";
        let src = fs.readFileSync(expand(apis), "utf8");
        let tplcfg = (<any>tpl).config;
        let old = tplcfg.whitespace;
        tplcfg.whitespace = true;
        let compiled = tpl.compile(src, "api-generator");
        tplcfg.whitespace = old;
        tpl.loadSource(compiled);
        tpl.render("api-generator", params, (err, out) => {
            if (err)
                out = err.toString();

            // 输出到客户端
            trans.output('text/plain', RespFile.Plain(out).asDownload("apis.ts"));
        });
    }

    config(cfg: IndexedObject): boolean {
        this._cfg = static_cast<RouterConfig>(cfg);
        return true;
    }

    protected _cfg: RouterConfig;

    static ActionsInfo(routers: Routers): ActionInfo[] {
        let r: ActionInfo[] = [];
        routers.forEach(e => {
            ArrayT.PushObjects(r, this.RouterActions(e));
        });
        return r;
    }

    protected static _ActionInfos = new Map<string, ActionInfo[]>();

    static RouterActions(router: IRouter): ActionInfo[] {
        if (this._ActionInfos.has(router.action))
            return this._ActionInfos.get(router.action);

        // 获得router身上的action信息以及属性列表
        let name = router.action;
        let as = GetAllActionNames(router);
        let r = ArrayT.Convert(as, a => {
            let ap = FindAction(router, a);
            let t = JsonObject<ActionInfo>();
            t.name = t.action = name + '.' + a;
            t.comment = ap.comment;
            t.params = this.ParametersInfo(ap.clazz);
            return t;
        });
        this._ActionInfos.set(router.action, r);
        return r;
    }

    static ParametersInfo(clz: AnyClass): ParameterInfo[] {
        let t = new clz();
        let fps = GetAllFields(t);
        return ObjectT.Convert(fps, (fp, name) => {
            let t = JsonObject<ParameterInfo>();
            t.name = name;
            t.array = fp.array;
            t.string = fp.string;
            t.integer = fp.integer;
            t.double = fp.double;
            t.boolean = fp.boolean;
            t.file = fp.file;
            t.enum = fp.enum;
            t.array = fp.array;
            t.map = fp.map;
            t.object = fp.json;
            t.optional = fp.optional;
            t.index = fp.id;
            t.input = fp.input;
            t.output = fp.output;
            t.comment = fp.comment;
            t.valtyp = fp.valtype;
            t.keytyp = fp.keytype;
            return t;
        });
    }
}