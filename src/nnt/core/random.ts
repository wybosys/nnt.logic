import {v4} from 'uuid';
import seedrandom = require("seed-random");

export class Random {

    constructor(sd?: string) {
        this._seed = sd;
    }

    valueOf(): number {
        return this.value;
    }

    get value(): number {
        if (!this._hdl) {
            this._hdl = seedrandom(this._seed, {entropy: this._entropy});
        }
        return this._hdl();
    }

    toString(): string {
        return this.value.toString();
    }

    get entropy(): boolean {
        return this._entropy;
    }

    set entropy(v: boolean) {
        if (this._entropy == v)
            return;
        this._hdl = null;
        this._entropy = v;
    }

    get seed(): string {
        return this._seed;
    }

    set seed(s: string) {
        if (this._seed == s)
            return;
        this._hdl = null;
        this._seed = s;
    }

    private _seed: string;
    private _hdl: any;
    private _entropy: boolean = true;

    static Rangef(from: number, to: number): number {
        return Math.random() * (to - from) + from;
    }

    // @param close true:[], false:[)
    static Rangei(from: number, to: number, close = false): number {
        if (close)
            return Math.round(Random.Rangef(from, to));
        return Math.floor(Random.Rangef(from, to));
    }

    rangef(from: number, to: number): number {
        return this.value * (to - from) + from;
    }

    rangei(from: number, to: number, close = false): number {
        if (close)
            return Math.round(this.rangef(from, to));
        return Math.floor(this.rangef(from, to));
    }
}

export function UUID(): string {
    return v4().replace(/-/g, "");
}

// 不保证完全唯一，但是可以指定宽度
export function unsafeUuid(len: number, radix: number) {
    var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('');
    var uuid = [], i;
    radix = radix || chars.length;
    if (len) {
        // Compact form
        for (i = 0; i < len; i++) uuid[i] = chars[0 | Math.random() * radix];
    } else {
        // rfc4122, version 4 form
        var r;
        // rfc4122 requires these characters
        uuid[8] = uuid[13] = uuid[18] = uuid[23] = '-';
        uuid[14] = '4';
        // Fill in random data.  At i==19 set the high bits of clock sequence as
        // per rfc4122, sec. 4.1.5
        for (i = 0; i < 36; i++) {
            if (!uuid[i]) {
                r = 0 | Math.random() * 16;
                uuid[i] = chars[(i == 19) ? (r & 0x3) | 0x8 : r];
            }
        }
    }
    return uuid.join('');
}
