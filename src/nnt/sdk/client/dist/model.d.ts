import { IMedia } from "./media";
export declare type Class<T> = {
    new (...args: any[]): T;
    [key: string]: any;
};
export declare type AnyClass = Class<any>;
export declare type IndexedObject = {
    [key: string]: any;
};
export declare type clazz_type = AnyClass | string;
export declare type jsonobj = string | Object;
export declare class CMap<K, V> {
    private _keys;
    private _vals;
    private _store;
    set(k: K, v: V): void;
    get(k: K): V;
    has(k: K): boolean;
    delete(k: K): void;
    clear(): void;
    forEach(cb: (v: any, k: any) => void): void;
}
export declare enum HttpMethod {
    GET = 0,
    POST = 1,
}
export declare enum SocketMethod {
    JSON = 0,
    PROTOBUF = 1,
}
export interface IResponseData {
    code: number;
    data: any;
}
export declare class RequestParams {
    fields: {
        [key: string]: any;
    };
    files: {
        [key: string]: File;
    };
    medias: {
        [key: string]: IMedia;
    };
}
export interface Paged {
    last: number;
    limit: number;
    items: any[];
    all: any[];
    ended: boolean;
}
export declare abstract class Base {
    [key: string]: any;
    host: string;
    wshost: string;
    code: number;
    error: string;
    action: string;
    method: HttpMethod;
    binary: SocketMethod;
    abstract requestUrl(): string;
    showWaiting(): void;
    hideWaiting(): void;
    enableWaiting: boolean;
    cacheTime: number;
    cacheFlush: boolean;
    protected _cacheUpdated: boolean;
    readonly cacheUpdated: boolean;
    keyForCache(): number;
    requestParams(): RequestParams;
    additionParams: IndexedObject;
    additionFiles: IndexedObject;
    additionMedias: IndexedObject;
    parseData(data: IResponseData, suc: () => void, error: (err: Error) => void): void;
    data: any;
    static NewRequest<T extends Base>(req: any): T;
    static BindImpl(api: any, models: any, routers: any): void;
    static Impl: any;
    static _COUNTER: number;
    hashCode: number;
    cmid: string;
    static string_t: string;
    static integer_t: string;
    static double_t: string;
    static boolean_t: string;
    static optional: string;
    static required: string;
    static input: string;
    static output: string;
    static string(id: number, opts: string[], comment?: string): (target: any, key: string) => void;
    static boolean(id: number, opts: string[], comment?: string): (target: any, key: string) => void;
    static integer(id: number, opts: string[], comment?: string): (target: any, key: string) => void;
    static double(id: number, opts: string[], comment?: string): (target: any, key: string) => void;
    static array(id: number, clz: clazz_type, opts: string[], comment?: string): (target: any, key: string) => void;
    static map(id: number, keytyp: clazz_type, valtyp: clazz_type, opts: string[], comment?: string): (target: any, key: string) => void;
    static json(id: number, opts: string[], comment?: string): (target: any, key: string) => void;
    static type(id: number, clz: clazz_type, opts: string[], comment?: string): (target: any, key: string) => void;
    static enumerate(id: number, clz: any, opts: string[], comment?: string): (target: any, key: string) => void;
    static file(id: number, opts: string[], comment?: string): (target: any, key: string) => void;
}
export declare function GetFieldOptions(mdl: any): any;
export declare function CheckInput(proto: any, params: any): boolean;
export declare const string_t = "string";
export declare const integer_t = "integer";
export declare const double_t = "double";
export declare const boolean_t = "boolean";
export declare function Decode(mdl: any, params: any): void;
export declare function toBoolean(v: any): boolean;
export declare function Encode(mdl: any): any;
export declare function Output(mdl: any): any;
export interface MidInfo {
    user: string;
    domain: string;
    resources?: string[];
}
export declare function mid_unparse(info: MidInfo): string;
