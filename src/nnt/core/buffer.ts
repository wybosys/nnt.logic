import {_128, _16, _256, _32, _33, _512, _64, _8} from "./digital";
import {ISerializableObject} from "./object";
import {StringT} from "./stringt";
import {ArrayT} from "./arrayt";

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

    serialize(): Buffer {
        return this._buf;
    }

    deserialize(buf: Buffer): this {
        return this.reset(buf) ? this : null;
    }
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

export class BasedBuffer {

    constructor(buf?: Buffer) {
        this._buf = buf;
    }

    get buffer(): Buffer {
        return this._buf;
    }

    get byteLength(): number {
        return this._buf.byteLength;
    }

    slice(begin?: number, end?: number): Buffer {
        return this._buf.slice(begin, end);
    }

    toString(encoding?: BufferEncoding, start?: number, end?: number): string {
        return this._buf.toString(encoding, start, end);
    }

    protected _buf: Buffer;
}

export enum TYPEBYTES {
    INT8 = 1,
    INT16 = 2,
    INT32 = 4,
    INT64 = 8,
    FLOAT = 4,
    DOUBLE = 8
}

export class StreamBuffer extends BasedBuffer {

    static From(buf: Buffer): StreamBuffer {
        let r = new StreamBuffer();
        r._buf = buf;
        return r;
    }

    static Alloc(len: number): StreamBuffer {
        let r = new StreamBuffer();
        r._buf = Buffer.alloc(len);
        return r;
    }

    writeUIntLE(value: number, byteLength: number): number {
        this._offset_write = this._buf.writeUIntLE(value, this._offset_write, byteLength);
        return this._offset_write;
    }

    writeUIntBE(value: number, byteLength: number): number {
        this._offset_write = this._buf.writeUIntBE(value, this._offset_write, byteLength);
        return this._offset_write;
    }

    writeIntLE(value: number, byteLength: number): number {
        this._offset_write = this._buf.writeIntLE(value, this._offset_write, byteLength);
        return this._offset_write;
    }

    writeIntBE(value: number, byteLength: number): number {
        this._offset_write = this._buf.writeIntBE(value, this._offset_write, byteLength);
        return this._offset_write;
    }

    readUIntLE(byteLength: number): number {
        let r = this._buf.readUIntLE(this._offset_read, byteLength);
        this._offset_read += byteLength;
        return r;
    }

    readUIntBE(byteLength: number): number {
        let r = this._buf.readUIntBE(this._offset_read, byteLength);
        this._offset_read += byteLength;
        return r;
    }

    readIntLE(byteLength: number): number {
        let r = this._buf.readIntLE(this._offset_read, byteLength);
        this._offset_read += byteLength;
        return r;
    }

    readIntBE(byteLength: number): number {
        let r = this._buf.readIntBE(this._offset_read, byteLength);
        this._offset_read += byteLength;
        return r;
    }

    readUInt8(): number {
        let r = this._buf.readUInt8(this._offset_read);
        this._offset_read += TYPEBYTES.INT8;
        return r;
    }

    readUInt16LE(): number {
        let r = this._buf.readUInt16LE(this._offset_read);
        this._offset_read += TYPEBYTES.INT16;
        return r;
    }

    readUInt16BE(): number {
        let r = this._buf.readUInt16BE(this._offset_read);
        this._offset_read += TYPEBYTES.INT16;
        return r;
    }

    readUInt32LE(): number {
        let r = this._buf.readUInt32LE(this._offset_read);
        this._offset_read += TYPEBYTES.INT32;
        return r;
    }

    readUInt32BE(): number {
        let r = this._buf.readUInt32BE(this._offset_read);
        this._offset_read += TYPEBYTES.INT32;
        return r;
    }

    readInt8(): number {
        let r = this._buf.readInt8(this._offset_read);
        this._offset_read += TYPEBYTES.INT8;
        return r;
    }

    readInt16LE(): number {
        let r = this._buf.readInt16LE(this._offset_read);
        this._offset_read += TYPEBYTES.INT16;
        return r;
    }

    readInt16BE(): number {
        let r = this._buf.readInt16BE(this._offset_read);
        this._offset_read += TYPEBYTES.INT16;
        return r;
    }

    readInt32LE(): number {
        let r = this._buf.readInt32LE(this._offset_read);
        this._offset_read += TYPEBYTES.INT32;
        return r;
    }

    readInt32BE(): number {
        let r = this._buf.readInt32BE(this._offset_read);
        this._offset_read += TYPEBYTES.INT32;
        return r;
    }

    readFloatLE(): number {
        let r = this._buf.readFloatLE(this._offset_read);
        this._offset_read += TYPEBYTES.INT32;
        return r;
    }

    readFloatBE(): number {
        let r = this._buf.readFloatBE(this._offset_read);
        this._offset_read += TYPEBYTES.FLOAT;
        return r;
    }

    readDoubleLE(): number {
        let r = this._buf.readDoubleLE(this._offset_read);
        this._offset_read += TYPEBYTES.DOUBLE;
        return r;
    }

    readDoubleBE(): number {
        let r = this._buf.readDoubleBE(this._offset_read);
        this._offset_read += TYPEBYTES.DOUBLE;
        return r;
    }

    readBigInt64LE(): bigint {
        let r = this._buf.readBigInt64LE(this._offset_read);
        this._offset_read += TYPEBYTES.INT64;
        return r;
    }

    readBigInt64BE(): bigint {
        let r = this._buf.readBigInt64BE(this._offset_read);
        this._offset_read += TYPEBYTES.INT64;
        return r;
    }

    writeUInt8(value: number): number {
        this._offset_write = this._buf.writeUInt8(value, this._offset_write);
        return this._offset_write;
    }

    writeUInt16LE(value: number): number {
        this._offset_write = this._buf.writeUInt16LE(value, this._offset_write);
        return this._offset_write;
    }

    writeUInt16BE(value: number): number {
        this._offset_write = this._buf.writeUInt16BE(value, this._offset_write);
        return this._offset_write;
    }

    writeUInt32LE(value: number): number {
        this._offset_write = this._buf.writeUInt32LE(value, this._offset_write);
        return this._offset_write;
    }

    writeUInt32BE(value: number): number {
        this._offset_write = this._buf.writeUInt32BE(value, this._offset_write);
        return this._offset_write;
    }

    writeInt8(value: number): number {
        this._offset_write = this._buf.writeInt8(value, this._offset_write);
        return this._offset_write;
    }

    writeInt16LE(value: number): number {
        this._offset_write = this._buf.writeInt16LE(value, this._offset_write);
        return this._offset_write;
    }

    writeInt16BE(value: number): number {
        this._offset_write = this._buf.writeInt16BE(value, this._offset_write);
        return this._offset_write;
    }

    writeInt32LE(value: number): number {
        this._offset_write = this._buf.writeInt32LE(value, this._offset_write);
        return this._offset_write;
    }

    writeInt32BE(value: number): number {
        this._offset_write = this._buf.writeInt32BE(value, this._offset_write);
        return this._offset_write;
    }

    writeFloatLE(value: number): number {
        this._offset_write = this._buf.writeFloatLE(value, this._offset_write);
        return this._offset_write;
    }

    writeFloatBE(value: number): number {
        this._offset_write = this._buf.writeFloatBE(value, this._offset_write);
        return this._offset_write;
    }

    writeDoubleLE(value: number): number {
        this._offset_write = this._buf.writeDoubleLE(value, this._offset_write);
        return this._offset_write;
    }

    writeDoubleBE(value: number): number {
        this._offset_write = this._buf.writeDoubleBE(value, this._offset_write);
        return this._offset_write;
    }

    writeBigInt64LE(value: bigint): number {
        this._offset_write = this._buf.writeBigInt64LE(value, this._offset_write);
        return this._offset_write;
    }

    writeBuffer(value: Buffer): number {
        this._buf.set(value, this._offset_write);
        this._offset_write += value.byteLength;
        return this._offset_write;
    }

    readBuffer(size: number): Buffer {
        let r = this._buf.slice(this._offset_read, this._offset_read + size);
        this._offset_read += size;
        return r;
    }

    toString(encoding?: BufferEncoding, start?: number, end?: number): string {
        if (end == null)
            end = this._offset_write;
        return this._buf.toString(encoding, start, end);
    }

    // 实际的数据长度
    get length(): number {
        return this._offset_write;
    }

    // 当前读写的便宜
    private _offset_read = 0;
    private _offset_write = 0;
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

    serialize(): Buffer {
        // count(32bits) + buffers[](length + buffer)
        const count = this._arr.length;
        const lbufs = ArrayT.Sum(this._arr, e => e.byteLength);
        let fbuf = StreamBuffer.Alloc(TYPEBYTES.INT32 + TYPEBYTES.INT32 * count + lbufs);

        // 填充数据
        fbuf.writeInt32BE(count);
        this._arr.forEach(e => {
            fbuf.writeInt32BE(e.byteLength);
            fbuf.writeBuffer(e);
        });

        return fbuf.buffer;
    }

    deserialize(b: Buffer): this {
        let buf = StreamBuffer.From(b);
        this._arr.length = 0;

        const count = buf.readInt32BE();
        for (let i = 0; i < count; ++i) {
            let size = buf.readInt32BE();
            let cur = buf.readBuffer(size);
            this._arr.push(cur);
        }

        return this;
    }

    private _arr: Buffer[] = [];
}