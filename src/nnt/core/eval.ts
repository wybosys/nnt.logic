import {logger} from "./logger";
import {IndexedObject} from "./kernel";

/** 运行公式 */
export function EvalFormula(f: string, vars: IndexedObject, upcase: boolean = true): any {
    try {
        let vs = [];
        for (let k in vars) {
            vs.push(!upcase ? k : k.toUpperCase() + "=" + vars[k]);
        }
        let cmd = "var " + vs.join(",") + ";" + f;
        return eval(cmd);
    } catch (err) {
        logger.log(err);
    }
}
