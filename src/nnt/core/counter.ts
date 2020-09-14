export class Counter {

    constructor(from: number, to: number = 0, delta: number = 1) {
        this.current = this.from = from;
        this.to = to;
        this.delta = delta;
    }

    step(): this {
        this.current += this.delta;
        if (this.current == this.to) {
            this._resolve();
        }
        return this;
    }

    reset(): this {
        this.current = this.from;
        return this;
    }

    async done() {
        return new Promise(resolve => {
            this._resolve = resolve;
        });
    }

    current: number;
    from: number;
    to: number;
    delta: number;
    private _resolve: Function;
}
