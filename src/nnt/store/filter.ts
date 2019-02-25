// 基于json定义用来解析

import {ArrayT, IndexedObject, toJson, toJsonObject} from "../core/kernel";
import {logger} from "../core/logger";

/**
 * {
 *     "and": [
 *         "abc": { "gt": 100 }
 *     ]
 * }
 */

const KEYWORDS = ["and", "or"];
const OPERATORS = ["gt", "gte", "eq", "not", "lt", "lte"];

export class Filter {

    clear() {
        this.ands.length = this.ors.length = 0;
        this.key = null;
    }

    // 解析，如果解析全新，需要手动调用clear方法
    parse(jsobj: any): boolean {
        for (let k in jsobj) {
            let v = jsobj[k];

            if (k == "and") {
                if (v instanceof Array) {
                    let suc = ArrayT.Each(v, e => {
                        let sub = new Filter();
                        if (sub.parse(e)) {
                            this.ands.push(sub);
                        } else {
                            logger.error(new Error('filter 解析失败 ' + toJson(e)));
                            return false;
                        }
                        return true;
                    });
                    if (!suc)
                        return false;
                } else {
                    logger.error(new Error('filter 解析失败 ' + toJson(v)));
                    return false;
                }
            } else if (k == "or") {
                if (v instanceof Array) {
                    let suc = ArrayT.Each(v, e => {
                        let sub = new Filter();
                        if (sub.parse(e)) {
                            this.ors.push(sub);
                        } else {
                            logger.error(new Error('filter 解析失败 ' + toJson(e)));
                            return false;
                        }
                        return true;
                    });
                    if (!suc)
                        return false;
                } else {
                    logger.error(new Error('filter 解析失败 ' + toJson(v)));
                    return false;
                }
            } else if (OPERATORS.indexOf(k) != -1) {
                this.operator = k;
                this.value = v;
            } else {
                this.key = k;
                for (let sk in v) {
                    let sv = v[sk];

                    let sub = new Filter();
                    sub.operator = sk;
                    sub.value = sv;
                    this.ands.push(sub);
                }
            }
        }
        return true;
    }

    ands: Filter[] = [];
    ors: Filter[] = [];
    key: string = null;
    operator: string = null;
    value: any = null;

    static Parse(str: string): Filter {
        let jsobj = toJsonObject(str);
        if (!jsobj)
            return null;
        let r = new Filter();
        if (!r.parse(jsobj))
            return null;
        return r;
    }

    protected attachToJsobj(obj: any) {
        if (this.key === null) {
            if (this.ands.length) {
                if (!('and' in obj))
                    obj['and'] = [];
                this.ands.forEach(e => {
                    let ref: IndexedObject = {};
                    obj['and'].push(ref);

                    e.attachToJsobj(ref);
                });
            }

            if (this.ors.length) {
                if (!('or' in obj))
                    obj['or'] = [];
                this.ors.forEach(e => {
                    let ref: IndexedObject = {};
                    obj['or'].push(ref);

                    e.attachToJsobj(ref);
                });
            }

            if (this.operator !== null && this.value !== null) {
                obj[this.operator] = this.value;
            }
        }

        if (this.key) {
            // 生成新的子节点
            let ref: IndexedObject = {};
            obj[this.key] = ref;

            if (this.ands.length) {
                if (!('and' in ref))
                    ref['and'] = [];
                this.ands.forEach(e => {
                    let t: IndexedObject = {};
                    ref['and'].push(t);

                    e.attachToJsobj(t);
                });
            }

            if (this.ors.length) {
                if (!('or' in ref))
                    ref['or'] = [];
                this.ors.forEach(e => {
                    let t: IndexedObject = {};
                    ref['or'].push(t);

                    e.attachToJsobj(t);
                });
            }
        }
    }

    toString(): string {
        let r: IndexedObject = {};
        this.attachToJsobj(r);
        return toJson(r);
    }
}
