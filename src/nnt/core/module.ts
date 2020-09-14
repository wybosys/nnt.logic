import {logger} from "./logger";
import {REGEX_JS} from "../component/pattern";
import * as fs from "fs";

export function PushModule(l: any, r: any) {
    for (let k in r)
        l[k] = r[k];
}

export function Require(nm: string, each?: (e: any) => void) {
    let t: any;
    try {
        t = require(nm);
    } catch (err) {
        logger.error(err);
    }
    if (each && t) {
        for (let k in t) {
            each(t[k]);
        }
    }
}

export function RequireDirectory(dir: string) {
    let files = fs.readdirSync(dir);
    files.forEach(e => {
        let ph = dir + "/" + e;
        let st = fs.statSync(ph);
        if (st.isFile()) {
            if (e.match(REGEX_JS))
                Require(ph);
        } else if (st.isDirectory()) {
            RequireDirectory(ph);
        }
    });
}
