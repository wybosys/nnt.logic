import {IndexedObject} from "../core/kernel";
import {ObjectT} from "../core/objectt";

let RE_PARAMETER = /\{\{([a-zA-Z0-9_.]+)\}\}/g;

export class Template {

    private _buf: string;

    compile(str: string, pat: RegExp = RE_PARAMETER): this {
        // 标记str中的变量，避免循环填数据
        this._buf = str.replace(pat, "@@__$1");
        return this;
    }

    render(parameters: IndexedObject): string {
        let str = this._buf;
        ObjectT.Foreach(parameters, (e, k) => {
            str = str.replace("@@__" + k, e);
        });
        return str;
    }
}
