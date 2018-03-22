import {ObjectExt} from "../core/object";
import {Attribute, Node} from "../config/config";
import {AppNodes} from "../config/app";

export class Filter {
    static LOG = "log";
    static WARN = "warn";
    static INFO = "info";
    static FATAL = "fatal";
    static EXCEPTION = "exception";
    static ALL = "all";

    static Explode(cfg: string): Set<string> {
        let r = new Set<string>();
        let vs: string[];
        if (cfg == Filter.ALL)
            vs = [Filter.LOG,
                Filter.WARN,
                Filter.INFO,
                Filter.FATAL,
                Filter.EXCEPTION
            ];
        else
            vs = Attribute.FromString(cfg);
        vs.forEach(e => {
            r.add(e);
        });
        return r;
    }
}

interface LoggerNode extends Node {
    filter: string;
}

export abstract class AbstractLogger extends ObjectExt {

    private _filters: Set<string>;

    isAllow(filter: string): boolean {
        return this._filters.has(filter);
    }

    config(cfg: Node, root?: AppNodes): boolean {
        let c = <LoggerNode>cfg;
        this._filters = Filter.Explode(c.filter);
        return true;
    }

    abstract log(msg: string): void;

    abstract warn(msg: string): void;

    abstract info(msg: string): void;

    abstract fatal(msg: string): void;

    abstract exception(msg: any): void;
}
