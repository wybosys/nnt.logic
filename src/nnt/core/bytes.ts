export class BytesBuilder {

    constructor(reserveLength = 1024, be = true) {
        this.reserveLength = reserveLength;
        this._capacity = this._left = reserveLength;
        this._offset = 0;
        this._buf = Buffer.allocUnsafe(reserveLength);
        this._be = be;
    }

    // 当长度不足时自动额外分配的大小
    reserveLength: number;

    protected _buf: Buffer;

    // 还剩下多少个字节的空间，加速判断
    protected _left: number;
    protected _offset: number;
    protected _capacity: number;
    protected _be: boolean;

    get buffer(): Buffer {
        return this._buf;
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

    // 写数据
    addInt8(val: number): this {
        this.deltaAlloc(1);
        this._buf.writeInt8(val, this._offset);
        this._offset += 1;
        this._left -= 1;
        return this;
    }

    addUInt8(val: number): this {
        this.deltaAlloc(1);
        this._buf.writeUInt8(val, this._offset);
        this._offset += 1;
        this._left -= 1;
        return this;
    }

    addInt16(val: number): this {
        this.deltaAlloc(2);
        this._be ? this._buf.writeInt16BE(val, this._offset) : this._buf.writeInt16LE(val, this._offset);
        this._offset += 2;
        this._left -= 2;
        return this;
    }

    addUInt16(val: number): this {
        this.deltaAlloc(2);
        this._be ? this._buf.writeUInt16BE(val, this._offset) : this._buf.writeUInt16LE(val, this._offset);
        this._offset += 2;
        this._left -= 2;
        return this;
    }

    addInt32(val: number): this {
        this.deltaAlloc(4);
        this._be ? this._buf.writeInt32BE(val, this._offset) : this._buf.writeInt32LE(val, this._offset);
        this._offset += 4;
        this._left -= 4;
        return this;
    }

    addUInt32(val: number): this {
        this.deltaAlloc(4);
        this._be ? this._buf.writeUInt32BE(val, this._offset) : this._buf.writeUInt32LE(val, this._offset);
        this._offset += 4;
        this._left -= 4;
        return this;
    }

    addFloat(val: number): this {
        this.deltaAlloc(4);
        this._be ? this._buf.writeFloatBE(val, this._offset) : this._buf.writeFloatLE(val, this._offset);
        this._offset += 4;
        this._left -= 4;
        return this;
    }

    addDouble(val: number): this {
        this.deltaAlloc(4);
        this._be ? this._buf.writeDoubleBE(val, this._offset) : this._buf.writeDoubleLE(val, this._offset);
        this._offset += 4;
        this._left -= 4;
        return this;
    }

    addString(val: string): this {
        const buf = new Buffer(val, "utf8");
        const lbuf = buf.byteLength;
        this.deltaAlloc(lbuf);
        buf.copy(this._buf, this._offset);
        this._offset += lbuf;
        this._left -= lbuf;
        return this;
    }
}