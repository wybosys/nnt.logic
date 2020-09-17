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

    // 默认为大端
    be = true;

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

    addInt16(val: number, be = this.be): this {
        return be ? this.addInt16BE(val) : this.addInt16LE(val);
    }

    addInt16LE(val: number): this {
        return this.addIntLE(val, TYPEBYTES.INT16);
    }

    addInt16BE(val: number): this {
        return this.addIntBE(val, TYPEBYTES.INT16);
    }

    setInt16(val: number, offset: number, be = this.be): this {
        return be ? this.setInt16BE(val, offset) : this.setInt16LE(val, offset);
    }

    setInt16LE(val: number, offset: number): this {
        this._buf.writeInt16LE(val, offset);
        return this;
    }

    setInt16BE(val: number, offset: number): this {
        this._buf.writeInt16BE(val, offset);
        return this;
    }

    addUInt16(val: number, be = this.be): this {
        return be ? this.addUInt16BE(val) : this.addUInt16LE(val);
    }

    addUInt16LE(val: number): this {
        return this.addUIntLE(val, TYPEBYTES.INT16);
    }

    addUInt16BE(val: number): this {
        return this.addUIntBE(val, TYPEBYTES.INT16);
    }

    setUInt16(val: number, offset: number, be = this.be): this {
        return be ? this.setUInt16BE(val, offset) : this.setUInt16LE(val, offset);
    }

    setUInt16LE(val: number, offset: number): this {
        this._buf.writeUInt16LE(val, offset);
        return this;
    }

    setUInt16BE(val: number, offset: number): this {
        this._buf.writeUInt16BE(val, offset);
        return this;
    }

    addInt32(val: number, be = this.be): this {
        return be ? this.addInt32BE(val) : this.addInt32LE(val);
    }

    addInt32LE(val: number): this {
        return this.addIntLE(val, TYPEBYTES.INT32);
    }

    addInt32BE(val: number): this {
        return this.addIntBE(val, TYPEBYTES.INT32);
    }

    setInt32(val: number, offset: number, be = this.be): this {
        return be ? this.setInt32BE(val, offset) : this.setInt32LE(val, offset);
    }

    setInt32LE(val: number, offset: number): this {
        this._buf.writeInt32LE(val, offset);
        return this;
    }

    setInt32BE(val: number, offset: number): this {
        this._buf.writeInt32BE(val, offset);
        return this;
    }

    addUInt32(val: number, be = this.be): this {
        return be ? this.addUInt32BE(val) : this.addUInt32LE(val);
    }

    addUInt32LE(val: number): this {
        return this.addIntLE(val, TYPEBYTES.INT32);
    }

    addUInt32BE(val: number): this {
        return this.addIntBE(val, TYPEBYTES.INT32);
    }

    setUInt32(val: number, offset: number, be = this.be): this {
        return be ? this.setUInt32BE(val, offset) : this.setUInt32LE(val, offset);
    }

    setUInt32LE(val: number, offset: number): this {
        this._buf.writeUInt32LE(val, offset);
        return this;
    }

    setUInt32BE(val: number, offset: number): this {
        this._buf.writeUInt32BE(val, offset);
        return this;
    }

    addBigInt64(val: bigint, be = this.be): this {
        return be ? this.addBigInt64BE(val) : this.addBigInt64LE(val);
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

    setBigInt64(val: bigint, offset: number, be = this.be): this {
        return be ? this.setBigInt64BE(val, offset) : this.setBigInt64LE(val, offset);
    }

    setBigInt64LE(val: bigint, offset: number): this {
        this._buf.writeBigInt64LE(val, offset);
        return this;
    }

    setBigInt64BE(val: bigint, offset: number): this {
        this._buf.writeBigInt64BE(val, offset);
        return this;
    }

    addBigUInt64(val: bigint, be = this.be): this {
        return be ? this.addBigUInt64BE(val) : this.addBigUInt64LE(val);
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

    setBigUInt64(val: bigint, offset: number, be = this.be): this {
        return be ? this.setBigUInt64BE(val, offset) : this.setBigUInt64LE(val, offset);
    }

    setBigUInt64LE(val: bigint, offset: number): this {
        this._buf.writeBigUInt64LE(val, offset);
        return this;
    }

    setBigUInt64BE(val: bigint, offset: number): this {
        this._buf.writeBigUInt64BE(val, offset);
        return this;
    }

    addFloat(val: number, be = this.be): this {
        return be ? this.addFloatBE(val) : this.addFloatLE(val);
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

    setFloat(val: number, offset: number, be = this.be): this {
        return be ? this.setFloatBE(val, offset) : this.setFloatLE(val, offset);
    }

    setFloatLE(val: number, offset: number): this {
        this._buf.writeFloatLE(val, offset);
        return this;
    }

    setFloatBE(val: number, offset: number): this {
        this._buf.writeFloatBE(val, offset);
        return this;
    }

    addDouble(val: number, be = this.be): this {
        return be ? this.addDoubleBE(val) : this.addDoubleLE(val);
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

    setDouble(val: number, offset: number, be = this.be): this {
        return be ? this.setDoubleBE(val, offset) : this.setDoubleLE(val, offset);
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