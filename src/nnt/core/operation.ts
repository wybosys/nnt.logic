export type ParellelFunc = () => Promise<void>;
export type ParellelCallbackFunc = (done: (err?: Error) => void) => void;

export interface ParellelError {
    func: ParellelFunc | ParellelCallbackFunc;
    error: any;
}

class _Parellel {

    async(func: ParellelFunc): this {
        this._asyncs.push(func);
        return this;
    }

    callback(func: ParellelCallbackFunc): this {
        this._cbs.push(func);
        return this;
    }

    async run(): Promise<ParellelError[]> {
        return new Promise<ParellelError[]>(resolve => {
            let count = this._asyncs.length + this._cbs.length;
            let errors: ParellelError[] = [];
            this._asyncs.forEach(e => {
                e().then(() => {
                    if (--count == 0) {
                        resolve(errors);
                    }
                }).catch(err => {
                    errors.push({
                        func: e,
                        error: err
                    });
                    if (--count == 0) {
                        resolve(errors);
                    }
                });
            });
            this._cbs.forEach(e => {
                e((err: Error) => {
                    if (err) {
                        errors.push({
                            func: e,
                            error: err
                        });
                    }
                    if (--count == 0) {
                        resolve(errors);
                    }
                });
            });
        });
    }

    private _asyncs: ParellelFunc[] = [];
    private _cbs: ParellelCallbackFunc[] = [];
}

export function Parellel(): _Parellel {
    return new _Parellel();
}
