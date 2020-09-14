import {COMPARERESULT, IndexedObject, KvObject, make_tuple2, tuple2} from "./kernel";

export class ObjectT {

    // 任意对象的比较
    static Compare(l: any, r: any): COMPARERESULT {
        if (l > r)
            return COMPARERESULT.GREATER;
        if (l < r)
            return COMPARERESULT.LESS;
        return COMPARERESULT.EQUAL;
    }

    static Minus(l: any, r: any): number {
        return l - r;
    }

    static Max<T>(l: T, r: T): T {
        return ObjectT.Compare(l, r) == COMPARERESULT.GREATER ? l : r;
    }

    static Min<T>(l: T, r: T): T {
        return ObjectT.Compare(l, r) == COMPARERESULT.LESS ? l : r;
    }

    static QueryObject(tgt: any, filter: (e: any, k: string) => boolean): any {
        for (let k in tgt) {
            let v = tgt[k];
            if (filter(v, k))
                return v;
        }
        return null;
    }

    static Foreach(tgt: any, proc: (e: any, k: string) => void) {
        for (let k in tgt) {
            proc(tgt[k], k);
        }
    }

    static Clear(tgt: any, proc: (e: any, k: string) => void) {
        for (let k in tgt) {
            proc(tgt[k], k);
            delete tgt[k];
        }
    }

    // 第一层的赋值，如果左边存在，则不覆盖左边的
    static LightMerge(l: any, r: any) {
        for (let k in r) {
            if (k in l)
                continue;
            l[k] = r[k];
        }
    }

    // from r copy to l
    static LightCopy(l: any, r: any) {
        for (let k in r) {
            l[k] = r[k];
        }
    }

    // 只copy第一层
    static LightClone(tgt: any): any {
        let r: IndexedObject = {};
        for (let k in tgt) {
            r[k] = tgt[k];
        }
        return r;
    }

    static DeepClone(tgt: any): any {
        let r: IndexedObject = {};
        for (let k in tgt) {
            let v = tgt[k];
            if (v == null) {
                r[k] = v;
            } else if (v instanceof Array) {
                let t: any[] = [];
                v.forEach(e => {
                    t.push(ObjectT.DeepClone(e));
                });
                r[k] = t;
            } else {
                let typ = typeof (v);
                if (typ == "string" || typ == "number" || typ == "boolean") {
                    r[k] = v;
                } else {
                    r[k] = ObjectT.DeepClone(v);
                }
            }
        }
        return r;
    }

    /** 比较两个实例是否相等
     @brief 优先使用比较函数的结果
     */
    static IsEqual<L, R>(l: L, r: R, eqfun?: (l: L, r: R) => boolean, eqctx?: any): boolean {
        if (l == null || r == null)
            return false;
        if (eqfun)
            return eqfun.call(eqctx, l, r);
        if (l && (<any>l).isEqual)
            return (<any>l).isEqual(r);
        if (r && (<any>r).isEqual)
            return (<any>r).isEqual(l);
        return <any>l == <any>r;
    }

    /** 根据查询路径获取值 */
    static GetValueByKeyPath(o: any, kp: string, def?: any): any {
        if (o == null)
            return def;
        let ks = kp.split('.');
        for (let i = 0; i < ks.length; ++i) {
            o = o[ks[i]];
            if (o == null)
                return def;
        }
        return o;
    }

    static GetValueByKeyPaths(o: any, def: any, ...ks: any[]): any {
        if (o == null)
            return def;
        for (let i = 0; i < ks.length; ++i) {
            o = o[ks[i]];
            if (o == null)
                return def;
        }
        return o;
    }

    /** 根据查询路径设置值 */
    static SetValueByKeyPath(o: any, kp: string, v: any): boolean {
        if (o == null) {
            console.warn("不能对null进行keypath的设置操作");
            return false;
        }
        let ks = kp.split('.');
        let l = ks.length - 1;
        for (let i = 0; i < l; ++i) {
            let k = ks[i];
            let t = o[k];
            if (t == null) {
                t = {};
                o[k] = t;
            }
            o = t;
        }
        o[ks[l]] = v;
        return true;
    }

    static SetValueByKeyPaths(o: any, v: any, ...ks: any[]): boolean {
        if (o == null) {
            console.warn("不能对null进行keypath的设置操作");
            return false;
        }
        let l = ks.length - 1;
        for (let i = 0; i < l; ++i) {
            let k = ks[i];
            let t = o[k];
            if (t == null) {
                t = {};
                o[k] = t;
            }
            o = t;
        }
        o[ks[l]] = v;
        return true;
    }

    // 展开成keypath的结构
    static KeyPathExpand(o: any): IndexedObject {
        let r: IndexedObject = {};
        this._KeyPathExpandAt(o, r, []);
        return r;
    }

    private static _KeyPathExpandAt(o: any, r: IndexedObject, p: string[]) {
        const typ = typeof o;
        if (typ == "number" || typ == "string" || typ == "boolean") {
            r[p.join('.')] = o;
            return;
        }

        if (o instanceof Array) {
            o.forEach((e, i) => {
                let np = p.concat();
                np.push(i.toString());
                this._KeyPathExpandAt(e, r, np);
            });
        } else if (o instanceof Map) {
            o.forEach((e, k) => {
                let np = p.concat();
                np.push(k);
                this._KeyPathExpandAt(e, r, np)
            });
        } else {
            for (let k in o) {
                let np = p.concat();
                np.push(k);
                this._KeyPathExpandAt(o[k], r, np);
            }
        }
    }

    static SeqForin<T, R>(obj: { [key: string]: T }, proc: (e: T, key: string, next: (ret?: R) => void) => void, complete: (ret?: R) => void) {
        let keys = Object.keys(obj);
        let iter = keys.entries();

        function next(ret?: R) {
            let val = iter.next();
            if (!val.done) {
                proc(obj[val.value[1]], keys[val.value[0]], next);
            } else {
                complete(ret);
            }
        }

        next();
    }

    static QueryObjects<V>(m: KvObject<V>, proc: (v: V, k: string) => boolean): V[] {
        let r = [];
        for (let k in m) {
            let v = m[k];
            if (proc(v, k))
                r.push(v);
        }
        return r;
    }

    static PopTuplesByFilter<V>(m: KvObject<V>, filter: (v: V, k: string) => boolean): tuple2<string, V>[] {
        let r = new Array();
        for (let k in m) {
            let v = m[k];
            if (filter(v, k)) {
                delete m[k];
                r.push(make_tuple2(k, v));
            }
        }
        return r;
    }

    static Convert<V, R>(m: KvObject<V>, convert: (v: V, k: string) => R, skipnull = false): R[] {
        let r = new Array<R>();
        for (let k in m) {
            let v = convert(m[k], k);
            if (skipnull && !v)
                continue;
            r.push(v);
        }
        return r;
    }

    static HasKey(m: any, key: string): boolean {
        if (!m)
            return false;
        return key in m;
    }

    static Get(m: any, key: string): any {
        return m[key];
    }

    static Set(m: any, key: string, value: any) {
        m[key] = value;
    }

    // @sort 是否打开字典序
    static ToMap(obj: IndexedObject, sort = true): Map<string, any> {
        let r = new Map<string, any>();
        let keys = Object.keys(obj);
        if (sort)
            keys.sort();
        keys.forEach(e => {
            r.set(e, obj[e]);
        });
        return r;
    }

    static Length(obj: any): number {
        return Object.keys(obj).length;
    }

    static RemoveKeyByFilter(obj: IndexedObject, filter: (val: any, key: any) => boolean): IndexedObject {
        let keys = Object.keys(obj);
        for (let i = 0, l = keys.length; i < l; ++i) {
            let key = keys[i];
            let val = obj[key];
            if (filter(val, key)) {
                delete obj[key];
                let r = Object.create(null);
                r[key] = val;
                return r;
            }
        }
        return null;
    }
}
