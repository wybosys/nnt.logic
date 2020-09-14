export class IterateT {

    static QueryObject<T>(iter: Iterator<T>, filter: (e: T, idx: number) => boolean): T {
        let idx = 0;
        let cur = iter.next();
        while (!cur.done) {
            if (filter(cur.value, idx++))
                return cur.value;
            cur = iter.next();
        }
        return null;
    }

    static ToArray<T>(iter: Iterator<T>, proc?: (v: T) => T): T[] {
        let r: T[] = [];
        let res = iter.next();
        while (!res.done) {
            r.push(proc ? proc(res.value) : res.value);
            res = iter.next();
        }
        return r;
    }
}
