import {IndexedObject} from "./kernel";

// 增加引用计数
export function grab<T>(o: T): T {
    if (o == null)
        return undefined;
    (<any>o).grab();
    return o;
}

// 减计数对象
export function drop<T>(o: T): T {
    if (o == null)
        return undefined;
    return (<any>o).drop();
}

// 直接析构一个对象
export function dispose<T>(o: T) {
    if (o == null)
        return;
    (<any>o).dispose();
}

// 序列化接口
export interface ISerializableObject {

    // 序列化
    serialize(): Buffer;

    // 反序列化，序列化成功返回自身，不成功返回null
    deserialize(buf: Buffer): this;
}

// 序列化为字符串接口
export interface ISerializableString {

    // 转换为字符串
    serialize(): string;

    // 从字符串读取
    unserialize(str: string): this;
}

// POD简单化对象接口
export interface IPodObject {

    // 转换为pod对象
    toPod(): IndexedObject;

    // 从pod对象转回, 成功返回this，失败返回null
    fromPod(obj: IndexedObject): this;
}

// 比较接口
export interface IComparableObject {

    compare(r: this): number;
}

export interface IEqualableObject {

    isEqual(r: this): boolean;
}

// 基Object的接口
export interface IObject {
    dispose(): void;
}

// 引用计数的接口
export interface IReference {
    drop(): void;

    grab(): void;
}

// 基带引用Object的接口
export interface IRefObject
    extends IObject, IReference {
}
