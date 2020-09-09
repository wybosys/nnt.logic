export class Address {

    constructor(name: string, deviceId: string) {
        this._name = name;
        this._deviceId = deviceId;
    }

    private _name: string;
    private _deviceId: string;

    get name(): string {
        return this._name;
    }

    get deviceId(): string {
        return this._deviceId;
    }

    toString(): string {
        return `${this._name}.${this._deviceId}`;
    }

    equals(r: Address): boolean {
        return r._name == this._name && r._deviceId == this._deviceId;
    }

    static FromString(str: string): Address {
        let sp = str.split('.');
        if (sp.length != 2)
            return null;
        return new Address(sp[0], sp[1]);
    }
}