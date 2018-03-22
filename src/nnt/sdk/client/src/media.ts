export interface IMedia {

    // 保存成string（一般为base64/data）格式
    save(cb: (res: string) => void): void;
}

export class DataMedia implements IMedia {

    constructor(data: string) {
        this._data = data;
    }

    private _data: string;

    save(cb: (res: string) => void) {
        cb(this._data);
    }
}

export class UrlMedia implements IMedia {

    constructor(url: string) {
        this._url = url;
    }

    private _url: string;

    save(cb: (res: string) => void) {
        cb(this._url);
    }
}
