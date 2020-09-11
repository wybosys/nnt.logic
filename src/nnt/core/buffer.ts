import {_16, _32, _64, _8} from "./digital";

type FixedBufferType = Uint8Array;

export abstract class FixedBuffer<BYTELEN> {

    constructor(len: any, buf?: FixedBufferType) {
        this._digital = len;
        if (buf) {
            this.reset(buf);
        } else {
            this._buf = new Uint8Array(this._digital.val);
        }
    }

    // 设置buffer，长度必须和类申明的一致
    reset(buf: FixedBufferType): boolean {
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

    get buffer(): FixedBufferType {
        return this._buf;
    }

    protected _buf: FixedBufferType;
    private _digital: any;
}

export class FixedBuffer8 extends FixedBuffer<_8> {

    constructor(buf?: FixedBufferType) {
        super(_8.obj, buf);
        this._8 = _8.obj;
    }

    private _8: _8;
}

export class FixedBuffer16 extends FixedBuffer<_16> {

    constructor(buf?: FixedBufferType) {
        super(_16.obj, buf);
        this._16 = _16.obj;
    }

    private _16: _16;
}

export class FixedBuffer32 extends FixedBuffer<_32> {

    constructor(buf?: FixedBufferType) {
        super(_32.obj, buf);
        this._32 = _32.obj;
    }

    private _32: _32;
}

export class FixedBuffer64 extends FixedBuffer<_64> {

    constructor(buf?: FixedBufferType) {
        super(_64.obj, buf);
        this._64 = _64.obj;
    }

    private _64: _64;
}
