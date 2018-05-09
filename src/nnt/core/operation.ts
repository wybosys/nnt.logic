import async = require("async");

export type QueueCallback = (next: () => void) => void;

export class Queue {

    add(func: QueueCallback): Queue {
        this._store.push(func);
        return this;
    }

    run() {
        let iter = this._store.entries();
        this.doIter(iter);
    }

    protected doIter(iter: IterableIterator<[number, QueueCallback]>) {
        let val = iter.next();
        if (val.done)
            return;
        val.value[1](() => {
            this.doIter(iter);
        });
    }

    private _store = new Array<QueueCallback>();
}

export class AsyncQueue {

    add(func: QueueCallback): AsyncQueue {
        this._store.push(func);
        return this;
    }

    done(cb: QueueCallback): AsyncQueue {
        this._done = cb;
        return this;
    }

    run() {
        async.forEach(this._store, (cb, err) => {
            cb(err);
        }, this._done);
    }

    private _store = new Array<QueueCallback>();
    private _done: QueueCallback;
}

export type ParellelFunc = () => Promise<void>;

class _Parellel {

    add(func: ParellelFunc): this {
        this._store.push(func);
        return this;
    }

    async run() {
        return new Promise(resolve => {
            let count = this._store.length;
            this._store.forEach(e => {
                e().then(() => {
                    if (--count == 0) {
                        resolve();
                    }
                });
            });
        });
    }

    private _store = new Array<ParellelFunc>();
}

export function Parellel(): _Parellel {
    return new _Parellel();
}