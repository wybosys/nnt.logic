// 带计数器的基Object
export class OidObject {

    private static __cnter = 0;
    private _oid: number = ++OidObject.__cnter;

    get oid(): number {
        return this._oid;
    }
}
