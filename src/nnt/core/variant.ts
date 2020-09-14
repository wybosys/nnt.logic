import {ISerializableString} from "./object";
import {IndexedObject} from "./kernel";
import {toJson, toJsonObject} from "./json";

export enum VariantType {
    UNKNOWN = 0,
    BUFFER = 1,
    STRING = 2,
    OBJECT = 3,
    BOOLEAN = 4,
    NUMBER = 5,
}

export class Variant implements ISerializableString {

    constructor(o: any) {
        this._raw = o;
        if (!o)
            return;
        if (o instanceof Buffer) {
            this._type = VariantType.BUFFER;
            this._buf = o;
        } else {
            const typ = typeof o;
            if (typ == "string") {
                this._type = VariantType.STRING;
                this._str = o;
            } else if (typ == "boolean") {
                this._type = VariantType.BOOLEAN;
                this._bol = o;
            } else if (typ == "number") {
                this._type = VariantType.NUMBER;
                this._num = o;
            } else {
                this._type = VariantType.OBJECT;
                this._jsobj = o;
            }
        }
    }

    get raw(): any {
        return this._raw;
    }

    static Unserialize(buf: string): Variant {
        if (!buf)
            return null;
        let t = new Variant(null);
        if (!t.unserialize(buf))
            return null;
        return t;
    }

    private _raw: any;
    private _type = VariantType.UNKNOWN;

    private _buf: Buffer;
    private _str: string;
    private _bol: boolean;
    private _num: number;
    private _jsobj: IndexedObject;

    get object(): any {
        return this._jsobj;
    }

    get value(): any {
        if (this._type == VariantType.STRING)
            return this._str;
        else if (this._type == VariantType.BUFFER)
            return this._buf;
        else if (this._type == VariantType.OBJECT)
            return this._jsobj;
        else if (this._type == VariantType.BOOLEAN)
            return this._bol;
        else if (this._type == VariantType.NUMBER)
            return this._num;
        return null;
    }

    set value(v: any) {
        if (this._type == VariantType.STRING)
            this._str = v;
        else if (this._type == VariantType.BUFFER)
            this._buf = v;
        else if (this._type == VariantType.OBJECT)
            this._jsobj = v;
        else if (this._type == VariantType.BOOLEAN)
            this._bol = v;
        else if (this._type == VariantType.NUMBER)
            this._num = v;
    }

    toBuffer(): Buffer {
        if (this._buf)
            return this._buf;
        this._buf = new Buffer(this.toString());
        return this._buf;
    }

    toString(): string {
        if (this._str)
            return this._str;
        if (this._type == VariantType.BUFFER)
            this._str = this._buf.toString();
        else if (this._type == VariantType.OBJECT)
            this._str = toJson(this._jsobj);
        else if (this._type == VariantType.BOOLEAN)
            this._str = this._bol ? "true" : "false";
        else if (this._type == VariantType.NUMBER)
            this._str = this._num.toString();
        return this._str;
    }

    toJsObj(): IndexedObject {
        if (this._jsobj)
            return this._jsobj;
        this._jsobj = toJsonObject(this.toString());
        return this._jsobj;
    }

    // 序列化
    serialize(): string {
        let s: IndexedObject = {_t: this._type, _i: "vo", _d: this.value};
        return toJson(s);
    }

    unserialize(buf: string): this {
        let obj: any = toJsonObject(buf);
        if (!obj)
            return null;
        if (obj._i != "vo") {
            switch (typeof obj) {
                case "number": {
                    this._type = VariantType.NUMBER;
                    this._num = obj;
                    return this;
                }
                case "string": {
                    this._type = VariantType.STRING;
                    this._str = obj;
                    return this;
                }
                case "boolean": {
                    this._type = VariantType.BOOLEAN;
                    this._bol = obj;
                    return this;
                }
            }
            return null;
        }
        this._type = obj._t;
        this.value = obj._d;
        return this;
    }
}
