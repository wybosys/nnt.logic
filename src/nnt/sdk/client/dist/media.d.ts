export interface IMedia {
    save(cb: (res: string) => void): void;
}
export declare class DataMedia implements IMedia {
    constructor(data: string);
    private _data;
    save(cb: (res: string) => void): void;
}
export declare class UrlMedia implements IMedia {
    constructor(url: string);
    private _url;
    save(cb: (res: string) => void): void;
}
