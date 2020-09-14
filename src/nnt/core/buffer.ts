import {_128, _16, _256, _32, _33, _512, _64, _8} from "./digital";
import {ISerializableObject} from "./object";
import {ArrayT, StringT} from "./kernel";

export type FixedBufferType = Buffer | Uint8Array;

function ToBuffer(buf: FixedBufferType): Buffer {
    if (buf instanceof Buffer) {
        return buf;
    }
    return Buffer.from(buf);
}

export abstract class FixedBuffer<BYTELEN> implements ISerializableObject {

    constructor(len: any, buf?: FixedBufferType) {
        this._digital = len;
        if (buf) {
            this.reset(ToBuffer(buf));
        } else {
            this._buf = Buffer.alloc(this._digital.val);
        }
    }

    // 设置buffer，长度必须和类申明的一致
    reset(buf: Buffer): boolean {
        if (buf.byteLength != this._digital.val) {
            console.error(`FixedBuffer:reset 长度不一致`);
            return false;
        }
        this._buf = buf;
        this.makedirty();
        return true;
    }

    compare(r: FixedBuffer<BYTELEN>): number {
        return this._buf.compare(r._buf);
    }

    isEqual(r: FixedBuffer<BYTELEN>): boolean {
        return this.compare(r) == 0;
    }

    at(idx: number): number {
        return this._buf[idx];
    }

    get length(): number {
        return this._digital.val;
    }

    get byteLength(): number {
        return this._buf.byteLength;
    }

    get byteOffset(): number {
        return this._buf.byteOffset;
    }

    get buffer(): Buffer {
        return this._buf;
    }

    slice(begin?: number, end?: number): Buffer {
        return this._buf.slice(begin, end);
    }

    toString(encoding?: BufferEncoding, start?: number, end?: number): string {
        return this._buf.toString(encoding, start, end);
    }

    protected _buf: Buffer;
    private _digital: any;

    private _dirty_hash: boolean = true; // 用于缓存计算好的hash
    private _hash: number;

    get hash(): number {
        if (this._dirty_hash) {
            this._hash = StringT.Hash(this._buf.toString('binary'));
            this._dirty_hash = false;
        }
        return this._hash;
    }

    protected makedirty() {
        this._dirty_hash = true;
    }

    serialize(): string {
        return this._buf.toString('base64');
    }

    unserialize(str: string): this {
        let buf = Buffer.from(str, 'base64');
        return this.reset(buf) ? this : null;
    }
}

export function UnserializeFixedBuffer<T extends ISerializableObject>(tmp: T, str?: string): T {
    if (!str)
        return null;
    return tmp.unserialize(str) ? tmp : null;
};

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

export class FixedBuffer33 extends FixedBuffer<_33> {

    constructor(buf?: FixedBufferType) {
        super(_33.obj, buf);
        this._33 = _33.obj;
    }

    private _33: _33;
}

export class FixedBuffer64 extends FixedBuffer<_64> {

    constructor(buf?: FixedBufferType) {
        super(_64.obj, buf);
        this._64 = _64.obj;
    }

    private _64: _64;
}

export class FixedBuffer128 extends FixedBuffer<_128> {

    constructor(buf?: FixedBufferType) {
        super(_128.obj, buf);
        this._128 = _128.obj;
    }

    private _128: _128;
}

export class FixedBuffer256 extends FixedBuffer<_256> {

    constructor(buf?: FixedBufferType) {
        super(_256.obj, buf);
        this._256 = _256.obj;
    }

    private _256: _256;
}

export class FixedBuffer512 extends FixedBuffer<_512> {

    constructor(buf?: FixedBufferType) {
        super(_512.obj, buf);
        this._512 = _512.obj;
    }

    private _512: _512;
}

export class Buffers implements ISerializableObject {

    constructor(...bufs: Buffer[]) {
        this._arr = bufs;
    }

    add(...bufs: Buffer[]): this {
        if (bufs.length > 1) {
            this._arr = this._arr.concat(bufs);
        } else if (bufs.length == 1) {
            this._arr.push(bufs[0]);
        }
        return this;
    }

    clear(): this {
        this._arr.length = 0;
        return this;
    }

    get size(): number {
        return this._arr.length;
    }

    at(idx: number): Buffer {
        return this._arr[idx];
    }

    forEach(fn: (e: Buffer, idx?: number) => void) {
        this._arr.forEach(fn);
    }

    serialize(): string {
        // count(32bits) + buffers[](size + buffer)
        const count = this._arr.length;
        const lbufs = ArrayT.Sum(this._arr, e => e.byteLength);
        let fbuf = new Buffer(4 + 4 * count + lbufs);

        // 填充数据
        let offset = fbuf.writeInt32BE(count);
        this._arr.forEach(e => {
            offset = fbuf.writeInt32BE(e.byteLength, offset);
            fbuf.set(e, offset);
            offset += e.byteLength;
        });

        return fbuf.toString('base64');
    }

    unserialize(str: string): this {
        let buf = Buffer.from(str, 'base64');
        this._arr.length = 0;

        let offset = 0;
        const count = buf.readInt32BE(offset);
        offset += 4;
        for (let i = 0; i < count; ++i) {
            let size = buf.readInt32BE(offset);
            offset += 4;
            let cur = buf.slice(offset, offset + size);
            offset += size;
            this._arr.push(cur);
        }

        return this;
    }

    private _arr: Buffer[] = [];
}