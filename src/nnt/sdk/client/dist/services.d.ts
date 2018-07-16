import { Content, InfoContent, Service } from "./service";
export declare class Services {
    static _default: Service;
    static Fetch<T extends Content>(cnt: T, suc: (cnt: T) => void, err?: (err: Error) => void): void;
    static Launch(cb: (info: InfoContent) => void): void;
}
