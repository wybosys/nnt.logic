import {action, expose, FindAction, GetAllActionNames, IRouter} from "../../core/router";
import {Null, STATUS} from "../../core/models";
import {Transaction} from "../transaction";
import {IRouterable, Routers} from "../routers";
import {IsClass, static_cast} from "../../core/core";
import {AnyClass, clazz_type, IndexedObject} from "../../core/kernel";
import {expand} from "../../core/url";
import {Template} from "../../component/template";
import {
    boolean,
    FpToDecoDef,
    FpToDecoDefPHP,
    FpToTypeDef,
    GetAllFields,
    GetAllOwnFields,
    GetModelInfo,
    input,
    IsModel,
    model,
    optional,
    Output
} from "../../core/proto";
import {logger} from "../../core/logger";
import {UpcaseFirst} from "../../core/string";
import {RespFile} from "../file";
import {GetDomain} from "../../core/devops";
import {JsonObject, toJson} from "../../core/json";
import {ObjectT} from "../../core/objectt";
import {ArrayT} from "../../core/arrayt";
import {Require} from "../../core/module";
import fs = require("fs");
import tpl = require("dustjs-linkedin");

interface ParameterInfo {
    name: string;
    string: boolean;
    integer: boolean;
    double: boolean;
    number: boolean;
    boolean: boolean;
    file: boolean;
    intfloat: number;
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

@model()
class ExportApis {

    @boolean(1, [input, optional], "生成 logic.node 使用的api")
    node: boolean;

    @boolean(2, [input, optional], "生成 logic.php 使用的api")
    php: boolean;

    @boolean(3, [input, optional], "生成 game.h5 游戏使用api")
    h5g: boolean;

    @boolean(4, [input, optional], "生成 vue 项目中使用的api")
    vue: boolean;
}

export class Router implements IRouter {
    action = "api";

    constructor() {
        this._page.compile(fs.readFileSync(expand("~/src/nnt/server/apidoc/apidoc.volt"), "utf8"));
    }

    private _page = new Template();

    @action(Null, [expose], "文档")
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

    @action(ExportApis, [expose], "生成api接口文件")
    export(trans: Transaction) {
        let m: ExportApis = trans.model;
        if (!m.node && !m.php && !m.h5g && !m.vue) {
            trans.status = STATUS.PARAMETER_NOT_MATCH;
            trans.submit();
            return;
        }

        // 分析出的所有结构
        let params = {
            domain: GetDomain(),
            namespace: "",
            clazzes: new Array(),
            enums: new Array(),
            consts: new Array(),
            routers: new Array()
        };

        if (m.php) {
            let sp = params.domain.split('/');
            params.namespace = UpcaseFirst(sp[0]) + '\\' + UpcaseFirst(sp[1]);
        }

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
                        let val = clz[key];
                        if (typeof val != 'function') {
                            em.defs.push({
                                name: key,
                                value: val
                            })
                        }
                    }
                } else if (mp.constant) {
                    for (let key in clz) {
                        params.consts.push({
                            name: name.toUpperCase() + "_" + key.toUpperCase(),
                            value: Output(clz[key])
                        });
                    }
                } else {
                    // 判断是否有父类
                    let clazz = {
                        name: name,
                        super: mp.parent ? mp.parent["name"] : "ApiModel",
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
                        let deco: string;
                        if (m.php) {
                            deco = FpToDecoDefPHP(fp);
                        } else {
                            deco = FpToDecoDef(fp, "Model.");
                        }
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
                let d: IndexedObject = {};
                d.name = UpcaseFirst(router.action) + UpcaseFirst(a);
                d.action = router.action + "." + a;
                let cn = ap.clazz["name"];
                if (m.vue || m.node) {
                    d.type = cn;
                } else if (m.php) {
                    d.type = 'M' + cn;
                } else {
                    d.type = "models." + cn;
                }
                d.comment = ap.comment;
                params.routers.push(d);
            });
        });

        // 渲染模板
        let apis = "~/src/nnt/server/apidoc/";
        if (m.node) {
            apis += "apis-node.dust";
        } else if (m.h5g) {
            apis += "apis-h5g.dust";
        } else if (m.vue) {
            apis += "apis-vue.dust";
        } else if (m.php) {
            apis += "apis-php.dust";
        } else {
            apis += "apis.dust";
        }

        let src = fs.readFileSync(expand(apis), "utf8");
        let tplcfg = (<any>tpl).config;
        let old = tplcfg.whitespace;
        tplcfg.whitespace = true;
        let compiled = tpl.compile(src, "api-generator");
        tplcfg.whitespace = old;
        tpl.loadSource(compiled);
        tpl.render("api-generator", params, (err, out) => {
            if (err) {
                out = err.toString();
            } else {
                // 需要加上php的头
                if (m.php) {
                    out = "<?php\n" + out;
                }
            }

            let apifile = params.domain.replace('/', '-') + '-apis';
            if (m.php) {
                apifile += ".php";
            } else {
                apifile += ".ts";
            }

            // 输出到客户端
            trans.output('text/plain', RespFile.Plain(out).asDownload(apifile));
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
        let name = router.action;

        if (this._ActionInfos.has(name))
            return this._ActionInfos.get(name);

        // 获得router身上的action信息以及属性列表
        let as = GetAllActionNames(router);
        let r = ArrayT.Convert(as, a => {
            let ap = FindAction(router, a);
            let t = JsonObject<ActionInfo>();
            t.name = t.action = name + '.' + a;
            t.comment = ap.comment;
            t.params = this.ParametersInfo(ap.clazz);
            return t;
        });
        this._ActionInfos.set(name, r);
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
            t.number = fp.number;
            t.intfloat = fp.intfloat;
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
