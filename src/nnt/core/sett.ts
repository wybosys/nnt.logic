import {IterateT} from "./iteratort";

export class SetT {

    static ToArray<T>(arr: Set<T>): T[] {
        let r: T[] = [];
        arr.forEach(e => {
            r.push(e);
        });
        return r;
    }

    static FromArray<T, R>(arr: T[], convert?: (e: T, idx?: number) => R, skipnull = true): Set<R> {
        let r = new Set<R>();
        if (convert) {
            arr.forEach((e, idx) => {
                let t = convert(e, idx);
                if (t == null && skipnull)
                    return;
                r.add(t);
            })
        } else {
            arr.forEach((e: any) => {
                if (e == null && skipnull)
                    return;
                r.add(e);
            });
        }
        return r;
    }

    static Clear<T>(arr: Set<T>, proc: (e: T) => void) {
        arr.forEach(proc);
        arr.clear();
    }

    static QueryObject<T>(arr: Set<T>, filter: (e: T, idx: number) => boolean): T {
        return IterateT.QueryObject(arr.values(), filter);
    }
}
