import { Base } from "./model";
export declare enum CacheTime {
    MINUTE = 60,
    HOUR = 3600,
    DAY = 86400,
}
export declare class CacheStorage {
    static IsValid: boolean;
    static Open(): void;
    static Put(key: number, mdl: Base): void;
    static Get(key: number, mdl: Base, cb: (obj: any) => void): any;
    static _hdl: IDBOpenDBRequest;
    static _version: number;
    static _db: any;
}
