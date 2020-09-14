import {Class} from "./kernel";

export class ReusableObjects<T> {

    constructor(clazz?: Class<T>) {
        this._clazz = clazz;
    }

    async use(clazz?: Class<T>): Promise<T> {
        let r = this._objects.pop();
        if (r)
            return r;
        return this.instance(clazz);
    }

    async unuse(obj: T, err?: any) {
        this._objects.push(obj);
    }

    async safe(cb: (obj: T) => Promise<void>, clazz?: Class<T>) {
        let t = await this.use(clazz);
        try {
            await cb(t);
            this.unuse(t);
        } catch (e) {
            this.unuse(t, e);
            throw e;
        }
    }

    protected async instance(clazz?: Class<T>): Promise<T> {
        if (!clazz)
            clazz = this._clazz;
        return new clazz();
    }

    clear() {
        this._objects.length = 0;
    }

    private _clazz: Class<T>;
    protected _objects: T[] = [];
}
