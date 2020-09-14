export class ArrayT {

    static Allocate<T>(len: number, obj: (idx?: number) => T): T[] {
        let r = new Array<T>();
        for (let i = 0; i < len; ++i) {
            r.push(obj(i));
        }
        return r;
    }

    static Merge<T>(...arr: Array<Array<T>>): T[] {
        let r = new Array<T>();
        arr && arr.forEach(e => {
            if (e)
                r = r.concat(e);
        });
        return r;
    }

    static Pack<T, R>(arr: T[], proc: (e: T, idx: number) => R, skipnull = true): R[] {
        let r: R[] = [];
        arr && arr.forEach((e, idx) => {
            let t = proc(e, idx);
            if (skipnull && t == null)
                return;
            r.push(t);
        });
        return r;
    }

    static Each<T>(arr: T[], proc: (e: T, idx: number) => boolean): boolean {
        if (arr) {
            for (let i = 0, l = arr.length; i < l; ++i) {
                if (!proc(arr[i], i))
                    return false;
            }
        }
        return true;
    }

    static async EachAsync<T>(arr: T[], proc: (e: T, idx: number) => Promise<boolean>): Promise<boolean> {
        if (arr) {
            for (let i = 0, l = arr.length; i < l; ++i) {
                if (!await proc(arr[i], i))
                    return false;
            }
        }
        return true;
    }

    static Sum<T>(arr: T[], proc: (e: T, idx: number) => number = (e: any) => e): number {
        let r = 0;
        arr.forEach((e, idx) => {
            let v = proc(e, idx);
            if (!v)
                v = 0;
            if (idx == 0)
                r = v;
            else
                r += v;
        });
        return r;
    }

    static Max<T, V>(arr: T[], proc: (e: T, idx: number) => V = (e: any) => e): T {
        let cur: V;
        let obj: T;
        arr.forEach((e, idx) => {
            if (idx == 0) {
                cur = proc(e, idx);
                obj = e;
                return;
            }
            let t = proc(e, idx);
            if (ObjectT.Compare(cur, t) == COMPARERESULT.LESS) {
                cur = t;
                obj = e;
            }
        });
        return obj;
    }

    static Min<T, V>(arr: T[], proc: (e: T, idx: number) => V = (e: any) => e): T {
        let cur: V;
        let obj: T;
        arr.forEach((e, idx) => {
            if (idx == 0) {
                cur = proc(e, idx);
                obj = e;
                return;
            }
            let t = proc(e, idx);
            if (ObjectT.Compare(t, cur) == COMPARERESULT.LESS) {
                cur = t;
                obj = e;
            }
        });
        return obj;
    }

    static MaxIndex<T, V>(arr: T[], proc: (e: T, idx: number) => V = (e: any) => e): number {
        let cur: V;
        let obj: number;
        arr.forEach((e, idx) => {
            if (idx == 0) {
                cur = proc(e, idx);
                obj = idx;
                return;
            }
            let t = proc(e, idx);
            if (ObjectT.Compare(cur, t) == COMPARERESULT.LESS) {
                cur = t;
                obj = idx;

            }
        });
        return obj;
    }

    static Clear<T>(arr: T[], proc: (e: T, idx: number) => void) {
        arr.forEach(proc);
        arr.length = 0;
    }

    static ToObject(...kvs: any[]): IndexedObject {
        let r: IndexedObject = {};
        for (let i = 0, l = kvs.length; i < l; i += 2) {
            r[kvs[i]] = kvs[i + 1];
        }
        return r;
    }

    /** 插入元素 */
    static InsertObjectAtIndex<T>(arr: T[], o: T, idx: number) {
        arr.splice(idx, 0, o);
    }

    static QueryObject<T>(arr: Array<T>, filter: (e: T, idx?: number) => boolean): T {
        if (arr)
            for (let i = 0, l = arr.length; i < l; ++i) {
                let e = arr[i];
                if (filter(e, i))
                    return e;
            }
        return null;
    }

    static QueryObjects<T>(arr: Array<T>, filter: (e: T, idx?: number) => boolean): Array<T> {
        let r = new Array<T>();
        arr && arr.forEach((e, idx) => {
            if (filter(e, idx))
                r.push(e);
        });
        return r;
    }

    /** 查询条件对应的索引 */
    static QueryIndex<T>(arr: T[], fun: (o: T, idx?: number) => boolean, ctx?: any, def?: number): number {
        let r = def;
        arr.some((o: T, idx: number): boolean => {
            if (fun.call(ctx, o, idx)) {
                r = idx;
                return true;
            }
            return false;
        }, this);
        return r;
    }

    static Convert<T, R>(arr: Array<T>, to: (e: T, idx?: number) => R, skipnull = false): Array<R> {
        let r = new Array<R>();
        arr && arr.forEach((e, idx) => {
            let t = to(e, idx);
            if (!t && skipnull)
                return;
            r.push(t);
        });
        return r;
    }

    static async ConvertAsync<T, R>(arr: Array<T>, to: (e: T, idx?: number) => Promise<R>, skipnull = false): Promise<Array<R>> {
        let r = new Array<R>();
        if (arr) {
            for (let i = 0, l = arr.length; i < l; ++i) {
                let t = await to(arr[i], i);
                if (!t && skipnull)
                    continue;
                r.push(t);
            }
        }
        return r;
    }

    static Random<T>(arr: T[], rand?: Random): T {
        if (!arr || arr.length == 0)
            return null;
        if (rand)
            return arr[rand.rangei(0, arr.length)];
        return arr[Random.Rangei(0, arr.length)];
    }

    static RandomPop<T>(arr: T[], rand?: Random): T {
        if (!arr || arr.length == 0)
            return null;
        let idx = rand ? rand.rangei(0, arr.length) : Random.Rangei(0, arr.length);
        let r = arr[idx];
        this.RemoveObjectAtIndex(arr, idx);
        return r;
    }

    static Randoms<T>(arr: T[], len: number, rand?: Random): T[] {
        if (arr.length <= len)
            return arr.concat();
        let r: T[] = [];
        while (r.length != len) {
            let t = ArrayT.Random(arr, rand);
            if (r.indexOf(t) == -1)
                r.push(t);
        }
        return r;
    }

    static PushObjects<T>(l: Array<T>, r: Array<T>) {
        r && r.forEach(e => {
            l.push(e);
        });
    }

    /** 使用另一个数组来填充当前数组 */
    static Set<T>(arr: T[], r: T[]) {
        arr.length = 0;
        r.forEach((o) => {
            arr.push(o);
        }, this);
    }

    /** 复制 */
    static Clone<T>(arr: T[]): T[] {
        if (!arr)
            return [];
        return arr.concat();
    }

    /** 使用指定索引全遍历数组，包括索引外的 */
    static FullEach<T>(arr: T[], idx: number, cbin: (o: T, idx: number) => void, cbout: (o: T, idx: number) => void) {
        let len = Math.min(arr.length, idx);
        for (let i = 0; i < len; ++i) {
            cbin(arr[i], i);
        }
        if (len >= idx) {
            len = arr.length;
            for (let i = idx; i < len; ++i) {
                cbout(arr[i], i);
            }
        }
    }

    /** 删除一个对象 */
    static RemoveObject<T>(arr: T[], obj: T): boolean {
        if (obj == null || arr == null)
            return false;
        let idx = arr.indexOf(obj);
        if (idx == -1)
            return false;
        arr.splice(idx, 1);
        return true;
    }

    /** 删除指定索引的对象 */
    static RemoveObjectAtIndex<T>(arr: T[], idx: number): T {
        let r = arr.splice(idx, 1);
        return r[0];
    }

    /** 使用筛选器来删除对象 */
    static RemoveObjectByFilter<T>(arr: T[], filter: (o: T, idx: number) => boolean, ctx?: any): T {
        if (arr) {
            for (let i = 0; i < arr.length; ++i) {
                let e = arr[i];
                if (filter.call(ctx, e, i)) {
                    arr.splice(i, 1);
                    return e;
                }
            }
        }
        return null;
    }

    static RemoveObjectsByFilter<T>(arr: T[], filter: (o: T, idx: number) => boolean, ctx?: any): T[] {
        let r = new Array();
        if (!arr)
            return r;
        let res = arr.filter((o, idx): boolean => {
            if (filter.call(ctx, o, idx)) {
                r.push(o);
                return false
            }
            return true;
        }, this);
        if (arr.length == res.length)
            return r;
        ArrayT.Set(arr, res);
        return r;
    }

    /** 调整大小 */
    static Resize<T>(arr: T[], size: number, def?: T) {
        if (arr.length < size) {
            let cnt = size - arr.length;
            let base = arr.length;
            for (let i = 0; i < cnt; ++i) {
                arr.push(def);
            }
        } else if (arr.length > size) {
            arr.length = size;
        }
    }

    /** 上浮满足需求的对象 */
    static Rise<T>(arr: T[], q: (e: T) => boolean) {
        let r = new Array();
        let n = new Array();
        arr.forEach((e: T) => {
            if (q(e))
                r.push(e);
            else
                n.push(e);
        });
        ArrayT.Set(arr, r.concat(n));
    }

    /** 下沉满足需求的对象 */
    static Sink<T>(arr: T[], q: (e: T) => boolean) {
        let r = new Array();
        let n = new Array();
        arr.forEach((e: T) => {
            if (q(e))
                r.push(e);
            else
                n.push(e);
        });
        this.Set(arr, n.concat(r));
    }

    /** 乱序 */
    static Disorder<T>(arr: T[]) {
        arr.sort((): number => {
            return Math.random() - Math.random();
        });
    }

    /** 截取尾部的空对象 */
    static Trim<T>(arr: T[], emp: T = null) {
        let t = [];
        for (let i = arr.length; i != 0; --i) {
            let o = arr[i - 1];
            if (t.length == 0 && o == emp)
                continue;
            t.push(o);
        }
        ArrayT.Set(arr, t.reverse());
    }

    static SafeJoin<T>(arr: Array<T>, sep: any, def: any): string {
        if (!arr)
            return def;
        if (arr.indexOf(null) == -1)
            return arr.join(sep);
        let tmp = arr.concat();
        tmp.forEach((e, idx) => {
            if (e == null)
                tmp[idx] = def;
        });
        return tmp.join(sep);
    }

    /** 取得一段 */
    static RangeOf<T>(arr: Array<T>, pos: number, len?: number): Array<T> {
        let n = arr.length;
        if (pos < 0) {
            pos = n + pos;
            if (pos < 0)
                return arr;
        }
        if (pos >= n)
            return [];
        let c = len == null ? n : pos + len;
        return arr.slice(pos, c);
    }

    /** 弹出一段 */
    static PopRangeOf<T>(arr: Array<T>, pos: number, len?: number): Array<T> {
        let n = arr.length;
        if (pos < 0) {
            pos = n + pos;
            if (pos < 0) {
                let r = arr.concat();
                arr.length = 0;
                return r;
            }
        }
        if (pos >= n)
            return [];
        let c = len == null ? n - pos : len;
        return arr.splice(pos, c);
    }

    /** 移除位于另一个 array 中的所有元素 */
    static RemoveObjectsInArray<T>(arr: T[], r: T[]) {
        let res = arr.filter((each: any, idx: number): boolean => {
            return !ArrayT.Contains(r, each);
        }, this);
        ArrayT.Set(arr, res);
    }

    /** 使用位于另一个 array 中对应下标的元素 */
    static RemoveObjectsInIndexArray<T>(arr: T[], r: number[]): T[] {
        let rm: T[] = [];
        let res = arr.filter((each: T, idx: number): boolean => {
            if (ArrayT.Contains(r, idx) == true) {
                rm.push(each);
                return false;
            }
            return true;
        }, this);
        ArrayT.Set(arr, res);
        return rm;
    }

    /** 使用比较函数来判断是否包含元素 */
    static Contains<L, R>(arr: L[], o: R, eqfun?: (l: L, o: R) => boolean, eqctx?: any): boolean {
        if (!arr || !arr.length)
            return false;
        if (typeof arr[0] == typeof o && ispod(o)) {
            return arr.indexOf(<any>o) != -1;
        }
        return arr.some((each: any): boolean => {
            return ObjectT.IsEqual(each, o, eqfun, eqctx);
        }, this);
    }

    /** 检查两个是否一样 */
    static EqualTo<L, R>(l: L[], r: R[], eqfun?: (l: L, r: R) => boolean, eqctx?: any): boolean {
        if (!l && !r)
            return true;
        if (!l || !r)
            return false;
        if (l.length != r.length)
            return false;
        return r.every((o: any): boolean => {
            return ArrayT.Contains(l, o, eqfun, eqctx);
        }, this);
    }

    /** 严格(包含次序)检查两个是否一样 */
    static StrictEqualTo<L, R>(l: L[], r: R[], eqfun?: (l: L, r: R) => boolean, eqctx?: any): boolean {
        if (!l && !r)
            return true;
        if (!l || !r)
            return false;
        if (l.length != r.length)
            return false;
        return r.every((o: any, idx: number): boolean => {
            return ObjectT.IsEqual(o, r[idx], eqfun, eqctx);
        }, this);
    }

    /** 数组 l 和 r 的共有项目 */
    static ArrayInArray<T>(l: T[], r: T[]): T[] {
        return l.filter((o): boolean => {
            return ArrayT.Contains(r, o);
        }, this);
    }

    /** 合并 */
    static Combine<T>(l: T[], sep: any): any {
        let r = l[0];
        for (let i = 1; i < l.length; i++) {
            r += sep + l[i];
        }
        return r;
    }

    static SeqForeach<T, R>(arr: T[], proc: (e: T, idx: number, next: (ret?: R) => void) => void, complete: (ret?: R) => void) {
        let iter = arr.entries();

        function next(ret?: R) {
            let val = iter.next();
            if (!val.done) {
                proc(val.value[1], val.value[0], next);
            } else {
                complete(ret);
            }
        }

        next();
    }

    /** 快速返回下一个或上一个 */
    static Next<T>(arr: Array<T>, obj: T, def?: T): T {
        let idx = arr.indexOf(obj);
        if (idx == -1)
            return def;
        if (idx + 1 == arr.length)
            return def;
        return arr[idx + 1];
    }

    static Previous<T>(arr: Array<T>, obj: T, def?: T): T {
        let idx = arr.indexOf(obj);
        if (idx == -1)
            return def;
        if (idx == 0)
            return def;
        return arr[idx - 1];
    }

    // 组合
    static CombineEach<T>(arr: T[], proc: (oo: T, io: T, idx?: number, oid?: number, iid?: number) => boolean) {
        let cont = true;
        let idx = 0;
        for (let i = 0, len = arr.length; i < len; ++i) {
            let outer = arr[i];
            for (let j = i + 1; j < len; ++j) {
                let inner = arr[j];
                cont = proc(outer, inner, idx++, i, j);
                if (!cont)
                    break;
            }
            if (!cont)
                break;
        }
    };

    static Combination<T>(arr: T[], m = arr.length): T[][] {
        let iter = G.combination(arr, m);
        // G的库需要
        return IterateT.ToArray(iter, e => e.slice());
    }

    static Permutation<T>(arr: T[], m = arr.length): T[][] {
        let iter = G.permutation(arr, m);
        return IterateT.ToArray(iter, e => e.slice());
    }

    static EachCombination<T>(arr: T[], m: number, proc: (e: T[]) => void) {
        this.Combination(arr, m).forEach(proc);
    }

    static EachPermutation<T>(arr: T[], m: number, proc: (e: T[]) => void) {
        this.Permutation(arr, m).forEach(proc);
    }

    // 把数组按照制定索引来排列，proc返回计算后的数组索引
    static MapIndexIn<T>(arr: T[], indics: number[], proc: (e: T, idx?: number) => number = (e, idx) => idx) {
        if (arr.length != indics.length)
            return;
        let tmp: T[] = [];
        arr.forEach((e, idx) => {
            let t = proc(e, idx);
            let pos = indics.indexOf(t);
            tmp[pos] = e;
        });
        this.Set(arr, tmp);
    }
}
