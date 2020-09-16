import {TYPEBYTES} from "./buffer";

export class BufferT {

    static FromInt8(v: number): Buffer {
        let b = Buffer.allocUnsafe(TYPEBYTES.INT8);
        b.writeInt8(v);
        return b;
    }

    static FromInt16LE(v: number): Buffer {
        let b = Buffer.allocUnsafe(TYPEBYTES.INT16);
        b.writeInt16LE(v);
        return b;
    }

    static FromInt16BE(v: number): Buffer {
        let b = Buffer.allocUnsafe(TYPEBYTES.INT16);
        b.writeInt16BE(v);
        return b;
    }

    static FromUInt16LE(v: number): Buffer {
        let b = Buffer.allocUnsafe(TYPEBYTES.INT16);
        b.writeUInt16LE(v);
        return b;
    }

    static FromUInt16BE(v: number): Buffer {
        let b = Buffer.allocUnsafe(TYPEBYTES.INT16);
        b.writeUInt16BE(v);
        return b;
    }

    static FromInt32LE(v: number): Buffer {
        let b = Buffer.allocUnsafe(TYPEBYTES.INT32);
        b.writeInt32LE(v);
        return b;
    }

    static FromInt32BE(v: number): Buffer {
        let b = Buffer.allocUnsafe(TYPEBYTES.INT32);
        b.writeInt32BE(v);
        return b;
    }

    static FromUInt32LE(v: number): Buffer {
        let b = Buffer.allocUnsafe(TYPEBYTES.INT32);
        b.writeUInt32LE(v);
        return b;
    }

    static FromUInt32BE(v: number): Buffer {
        let b = Buffer.allocUnsafe(TYPEBYTES.INT32);
        b.writeUInt32BE(v);
        return b;
    }

    static FromFloatLE(v: number): Buffer {
        let b = Buffer.allocUnsafe(TYPEBYTES.FLOAT);
        b.writeFloatLE(v);
        return b;
    }

    static FromFloatBE(v: number): Buffer {
        let b = Buffer.allocUnsafe(TYPEBYTES.FLOAT);
        b.writeFloatBE(v);
        return b;
    }

    static FromDoubleLE(v: number): Buffer {
        let b = Buffer.allocUnsafe(TYPEBYTES.DOUBLE);
        b.writeDoubleLE(v);
        return b;
    }

    static FromDoubleBE(v: number): Buffer {
        let b = Buffer.allocUnsafe(TYPEBYTES.DOUBLE);
        b.writeDoubleBE(v);
        return b;
    }
}
