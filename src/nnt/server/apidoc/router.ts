import {action, FindAction, GetAllActionNames, IRouter} from "../../core/router";
import {Null} from "../../core/models";
import {Transaction} from "../transaction";
import {IRouterable, Routers} from "../routers";
import {static_cast} from "../../core/core";
import {AnyClass, ArrayT, JsonObject, length, ObjectT, toJson} from "../../core/kernel";
import {expand} from "../../core/url";
import {Template} from "../../component/template";
import {GetAllFields} from "../../core/proto";
import fs = require("fs");

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
}

interface ActionInfo {
    name: string;
    action: string;
    comment: string;
    params: ParameterInfo[];
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
        if (length(srv.routers)) {
            // 收集routers的信息
            let infos = Router.ActionsInfo(srv.routers);
            // 渲染页面
            trans.output('text/html;charset=utf-8;', this._page.render({actions: toJson(infos)}));
        }
        trans.submit();
    }

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
            return t;
        });
    }
}