import {ObjectExt} from "../core/sobject";
import {Attribute, Node} from "../config/config";
import {AppNodes} from "../config/app";
import {SStatus} from "../core/models";

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

export interface LoggerNode extends Node {
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

    abstract log(msg: string, status?: SStatus): void;

    abstract warn(msg: string, status?: SStatus): void;

    abstract info(msg: string, status?: SStatus): void;

    abstract fatal(msg: string, status?: SStatus): void;

    abstract exception(msg: any, status?: SStatus): void;
}
