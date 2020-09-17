import {TYPEBYTES} from "./buffer";

export class BytesBuilder {

    constructor(reserveLength = 1024) {
        this.reserveLength = reserveLength;
        this._capacity = this._left = reserveLength;
        this._offset = 0;
        this._buf = Buffer.allocUnsafe(reserveLength);
    }

    // 当长度不足时自动额外分配的大小
    reserveLength: number;

    protected _buf: Buffer;

    // 还剩下多少个字节的空间，加速判断
    protected _left: number;
    protected _offset: number;
    protected _capacity: number;

    get buffer(): Buffer {
        return this._buf;
    }

    trim(): this {
        this._buf = this._buf.subarray(0, this._offset);
        this._left = 0;
        this._capacity = this._offset;
        return this;
    }

    // 总容量
    get capacity(): number {
        return this._capacity;
    }

    // 当前的偏移
    get offset(): number {
        return this._offset;
    }

    // 申请特定长度的空间
    protected deltaAlloc(length: number) {
        if (this._left < length) {
            let old = this._buf;
            this._capacity += this.reserveLength;
            this._left += this.reserveLength;
            this._buf = Buffer.allocUnsafe(this._capacity);
            old.copy(this._buf);
        }
    }

    protected addIntLE(val: number, bl: number): this {
        this.deltaAlloc(bl);
        this._buf.writeIntLE(val, this._offset, bl);
        this._offset += bl;
        this._left -= bl;
        return this;
    }

    protected addIntBE(val: number, bl: number): this {
        this.deltaAlloc(bl);
        this._buf.writeIntBE(val, this._offset, bl);
        this._offset += bl;
        this._left -= bl;
        return this;
    }

    protected addUIntLE(val: number, bl: number): this {
        this.deltaAlloc(bl);
        this._buf.writeUIntLE(val, this._offset, bl);
        this._offset += bl;
        this._left -= bl;
        return this;
    }

    protected addUIntBE(val: number, bl: number): this {
        this.deltaAlloc(bl);
        this._buf.writeUIntBE(val, this._offset, bl);
        this._offset += bl;
        this._left -= bl;
        return this;
    }

    addInt8(val: number): this {
        this.deltaAlloc(1);
        this._buf.writeInt8(val, this._offset);
        this._offset += 1;
        this._left -= 1;
        return this;
    }

    setInt8(val: number, offset: number): this {
        this._buf.writeInt8(val, offset);
        return this;
    }

    addUInt8(val: number): this {
        this.deltaAlloc(1);
        this._buf.writeUInt8(val, this._offset);
        this._offset += 1;
        this._left -= 1;
        return this;
    }

    setUInt8(val: number, offset: number): this {
        this._buf.writeUInt8(val, offset);
        return this;
    }

    addInt16LE(val: number): this {
        return this.addIntLE(val, TYPEBYTES.INT16);
    }

    addInt16BE(val: number): this {
        return this.addIntBE(val, TYPEBYTES.INT16);
    }

    setInt16LE(val: number, offset: number): this {
        this._buf.writeInt16LE(val, offset);
        return this;
    }

    setInt16BE(val: number, offset: number): this {
        this._buf.writeInt16BE(val, offset);
        return this;
    }

    addUInt16LE(val: number): this {
        return this.addUIntLE(val, TYPEBYTES.INT16);
    }

    addUInt16BE(val: number): this {
        return this.addUIntBE(val, TYPEBYTES.INT16);
    }

    setUInt16LE(val: number, offset: number): this {
        this._buf.writeUInt16LE(val, offset);
        return this;
    }

    setUInt16BE(val: number, offset: number): this {
        this._buf.writeUInt16BE(val, offset);
        return this;
    }

    addInt32LE(val: number): this {
        return this.addIntLE(val, TYPEBYTES.INT32);
    }

    addInt32BE(val: number): this {
        return this.addIntBE(val, TYPEBYTES.INT32);
    }

    setInt32LE(val: number, offset: number): this {
        this._buf.writeInt32LE(val, offset);
        return this;
    }

    setInt32BE(val: number, offset: number): this {
        this._buf.writeInt32BE(val, offset);
        return this;
    }

    addUInt32LE(val: number): this {
        return this.addIntLE(val, TYPEBYTES.INT32);
    }

    addUInt32BE(val: number): this {
        return this.addIntBE(val, TYPEBYTES.INT32);
    }

    setUInt32LE(val: number, offset: number): this {
        this._buf.writeUInt32LE(val, offset);
        return this;
    }

    setUInt32BE(val: number, offset: number): this {
        this._buf.writeUInt32BE(val, offset);
        return this;
    }

    addBigInt64LE(val: bigint): this {
        this.deltaAlloc(TYPEBYTES.INT64);
        this._buf.writeBigInt64LE(val, this._offset);
        this._offset += TYPEBYTES.INT64;
        this._left -= TYPEBYTES.INT64;
        return this;
    }

    addBigInt64BE(val: bigint): this {
        this.deltaAlloc(TYPEBYTES.INT64);
        this._buf.writeBigInt64BE(val, this._offset);
        this._offset += TYPEBYTES.INT64;
        this._left -= TYPEBYTES.INT64;
        return this;
    }

    addBigUInt64LE(val: bigint): this {
        this.deltaAlloc(TYPEBYTES.INT64);
        this._buf.writeBigUInt64LE(val, this._offset);
        this._offset += TYPEBYTES.INT64;
        this._left -= TYPEBYTES.INT64;
        return this;
    }

    addBigUInt64BE(val: bigint): this {
        this.deltaAlloc(TYPEBYTES.INT64);
        this._buf.writeBigUInt64BE(val, this._offset);
        this._offset += TYPEBYTES.INT64;
        this._left -= TYPEBYTES.INT64;
        return this;
    }

    addFloatLE(val: number): this {
        this.deltaAlloc(TYPEBYTES.FLOAT);
        this._buf.writeFloatLE(val, this._offset);
        this._offset += TYPEBYTES.FLOAT;
        this._left -= TYPEBYTES.FLOAT;
        return this;
    }

    addFloatBE(val: number): this {
        this.deltaAlloc(TYPEBYTES.FLOAT);
        this._buf.writeFloatBE(val, this._offset);
        this._offset += TYPEBYTES.FLOAT;
        this._left -= TYPEBYTES.FLOAT;
        return this;
    }

    setFloatLE(val: number, offset: number): this {
        this._buf.writeFloatLE(val, offset);
        return this;
    }

    setFloatBE(val: number, offset: number): this {
        this._buf.writeFloatBE(val, offset);
        return this;
    }

    addDoubleLE(val: number): this {
        this.deltaAlloc(TYPEBYTES.DOUBLE);
        this._buf.writeDoubleLE(val, this._offset);
        this._offset += TYPEBYTES.DOUBLE;
        this._left -= TYPEBYTES.DOUBLE;
        return this;
    }

    addDoubleBE(val: number): this {
        this.deltaAlloc(TYPEBYTES.DOUBLE);
        this._buf.writeDoubleBE(val, this._offset);
        this._offset += TYPEBYTES.DOUBLE;
        this._left -= TYPEBYTES.DOUBLE;
        return this;
    }

    setDoubleLE(val: number, offset: number): this {
        this._buf.writeDoubleLE(val, offset);
        return this;
    }

    setDoubleBE(val: number, offset: number): this {
        this._buf.writeDoubleBE(val, offset);
        return this;
    }

    addString(val: string, encoding: BufferEncoding = 'utf8'): this {
        const buf = new Buffer(val, encoding);
        const lbuf = buf.byteLength;
        this.deltaAlloc(lbuf);
        buf.copy(this._buf, this._offset);
        this._offset += lbuf;
        this._left -= lbuf;
        return this;
    }

    addBuffer(val: Buffer): this {
        const lbuf = val.byteLength;
        this.deltaAlloc(lbuf);
        val.copy(this._buf, this._offset);
        this._offset += lbuf;
        this._left -= lbuf;
        return this;
    }
}