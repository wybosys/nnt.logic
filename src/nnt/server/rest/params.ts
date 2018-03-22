import xml2js = require("xml2js");
import {toJsonObject} from "../../core/kernel";

export function ParseContentToParams(buf: string, ct: string): Promise<Map<string, any>> {
    return new Promise(resolve => {
        let m = new Map<string, any>();
        // 判断是不是xml
        if (ct.indexOf("xml") != -1) {
            xml2js.parseString(buf, (err, result) => {
                if (err) {
                    resolve(m);
                    return;
                }
                for (let root in result) {
                    let ele = result[root];
                    for (let k in ele) {
                        m.set(k, ele[k][0]);
                    }
                }
                resolve(m);
            });
        }
        // 判断是不是json
        else if (ct.indexOf("json") != -1) {
            let jsobj = toJsonObject(buf);
            if (!jsobj) {
                resolve(m);
                return;
            }
            for (let k in jsobj) {
                m.set(k, jsobj[k]);
            }
            resolve(m);
        }
        else {
            // 否则什么都不处理
            resolve(m);
        }
    });
}