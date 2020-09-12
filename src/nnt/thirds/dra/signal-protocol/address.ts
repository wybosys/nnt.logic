import {StringT, toInt} from "../../../core/kernel";

export class Address {

    constructor(name: string, deviceId: number) {
        this._name = name;
        this._deviceId = deviceId;
        this._hash = StringT.Hash(this.toString());
    }

    private _name: string;
    private _deviceId: number;

    get name(): string {
        return this._name;
    }

    get deviceId(): number {
        return this._deviceId;
    }

    toString(): string {
        return `${this._name}.${this._deviceId}`;
    }

    private _hash: number;

    get hash(): number {
        return this._hash;
    }

    equals(r: Address): boolean {
        return r._name == this._name && r._deviceId == this._deviceId;
    }

    static FromString(str: string): Address {
        let sp = str.split('.');
        if (sp.length != 2)
            return null;
        return new Address(sp[0], toInt(sp[1]));
    }
}