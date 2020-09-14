// nodejs基础的File对象仅是一个interface，所以需要包一层
export class UploadedFile {

    constructor(file: File) {
        this._f = file;
    }

    get lastModified(): number {
        return this._f.lastModified;
    }

    get name(): string {
        return this._f.name;
    }

    get file(): File {
        return this._f;
    }

    get size(): number {
        return this._f.size;
    }

    get type(): string {
        return this._f.type;
    }

    get path(): string {
        return (<any>this._f).path;
    }

    private _f: File;
}
