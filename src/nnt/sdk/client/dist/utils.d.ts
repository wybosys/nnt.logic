import { IndexedObject, jsonobj } from "./model";
export declare type PodType = number | string | boolean;
export interface INumber {
    toNumber(): number;
}
/** 转换到 float */
export declare function toFloat<T extends INumber>(o: PodType | T, def?: number): number;
export declare const MAX_INT = 2147483647;
export declare const MIN_INT: number;
/** 转换到 int */
export declare function toInt<T extends INumber>(o: PodType | T, def?: number): number;
/** 转换到数字
 @brief 如果对象不能直接转换，会尝试调用对象的 toNumber 进行转换
 */
export declare function toNumber<T extends INumber>(o: PodType | T, def?: number): number;
export declare class Random {
    static Rangef(from: number, to: number): number;
    static Rangei(from: number, to: number, close?: boolean): number;
}
export declare class ArrayT {
    /** 取得一段 */
    static RangeOf<T>(arr: Array<T>, pos: number, len?: number): Array<T>;
    static RemoveObject<T>(arr: T[], obj: T): boolean;
    static Convert<T, R>(arr: Array<T>, to: (e: T, idx?: number) => R, skipnull?: boolean): Array<R>;
    static AsyncForeach<T>(arr: T[], each: (next: () => void, obj: T, idx: number) => void, complete: () => void): void;
    static AsyncConvert<T, R>(arr: T[], cvt: (next: (obj: R) => void, obj: T, idx: number) => void, complete: (res: R[]) => void): void;
}
export declare class ObjectT {
    static SeqForin<T, R>(obj: {
        [key: string]: T;
    }, proc: (e: T, key: string, next: (ret?: R) => void) => void, complete: (ret?: R) => void): void;
}
export declare class StringT {
    static Hash(str: string): number;
    static Lowercase(str: string, def?: string): string;
    static Uppercase(str: string, def?: string): string;
    static UpcaseFirst(str: string): string;
}
export declare function timestamp(): number;
export declare class Device {
    static IOS: boolean;
}
export declare function toJsonObject(o: jsonobj, def?: any): IndexedObject;
export declare function toJson(o: IndexedObject, def?: string): string;
export declare function RetryTime(retrys: number): number;
export declare function InstanceXmlHttpRequest(): XMLHttpRequest;
export declare function LoadJs(id: string, url: string, suc?: () => void): void;
export declare class Mask {
    static Set(value: number, mask: number): number;
    static Unset(value: number, mask: number): number;
    static Has(value: number, mask: number): boolean;
}
