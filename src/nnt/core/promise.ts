import {Counter} from "./counter";

export class PromiseQueue {

    push(p: () => Promise<void>): this {
        this._q.push(p);
        return this;
    }

    async run(batch: number = 1) {
        let ct = new Counter(batch, 0, -1);
        for (let i = 0, l = this._q.length; i < l; i += batch) {
            if (l - i < batch)
                ct.from = l - i;
            ct.reset();

            for (let j = 0; j < ct.from; ++j) {
                let q = this._q[i + j];
                q().then(d => {
                    ct.step();
                }).catch(() => {
                    ct.step();
                });
            }

            await ct.done();
        }
    }

    private _q = new Array<() => Promise<void>>();
}
