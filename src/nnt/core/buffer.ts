import {_128, _16, _256, _32, _33, _512, _64, _8} from "./digital";

export abstract class FixedBuffer<BYTELEN> {

    constructor(len: any, buf?: Buffer) {
        this._digital = len;
        if (buf) {
            this.reset(buf);
        } else {
            this._buf = Buffer.alloc(this._digital.val);
        }
    }

    // 设置buffer，长度必须和类申明的一致
    reset(buf: Buffer): boolean {
        if (buf.byteLength - buf.byteOffset != this._digital.val) {
            console.error(`FixedBuffer:reset 长度不一致`);
            return false;
        }
        this._buf = buf;
        return true;
    }

    get length(): number {
        return this._digital.val;
    }

    get buffer(): Uint8Array {
        return this._buf;
    }

    toString(encoding?: BufferEncoding, start?: number, end?: number): string {
        return this._buf.toString(encoding, start, end);
    }

    protected _buf: Buffer;
    private _digital: any;
}

export class FixedBuffer8 extends FixedBuffer<_8> {

    constructor(buf?: Buffer) {
        super(_8.obj, buf);
        this._8 = _8.obj;
    }

    private _8: _8;
}

export class FixedBuffer16 extends FixedBuffer<_16> {

    constructor(buf?: Buffer) {
        super(_16.obj, buf);
        this._16 = _16.obj;
    }

    private _16: _16;
}

export class FixedBuffer32 extends FixedBuffer<_32> {

    constructor(buf?: Buffer) {
        super(_32.obj, buf);
        this._32 = _32.obj;
    }

    private _32: _32;
}

export class FixedBuffer33 extends FixedBuffer<_33> {

    constructor(buf?: Buffer) {
        super(_33.obj, buf);
        this._33 = _33.obj;
    }

    private _33: _33;
}

export class FixedBuffer64 extends FixedBuffer<_64> {

    constructor(buf?: Buffer) {
        super(_64.obj, buf);
        this._64 = _64.obj;
    }

    private _64: _64;
}

export class FixedBuffer128 extends FixedBuffer<_128> {

    constructor(buf?: Buffer) {
        super(_128.obj, buf);
        this._128 = _128.obj;
    }

    private _128: _128;
}

export class FixedBuffer256 extends FixedBuffer<_256> {

    constructor(buf?: Buffer) {
        super(_256.obj, buf);
        this._256 = _256.obj;
    }

    private _256: _256;
}

export class FixedBuffer512 extends FixedBuffer<_512> {

    constructor(buf?: Buffer) {
        super(_512.obj, buf);
        this._512 = _512.obj;
    }

    private _512: _512;
}
