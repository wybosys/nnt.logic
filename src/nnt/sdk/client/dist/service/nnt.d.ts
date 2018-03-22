import { AudioContent, AuthContent, ImageContent, InfoContent, LoginContent, PayContent, Service, ShareContent } from "../service";
export interface WeixinQrcodePayData {
    url: string;
}
export interface WeixinH5PayData {
    url: string;
}
export declare class NntService extends Service {
    prepare(cnt: InfoContent, cb: () => void): void;
    auth(cnt: AuthContent): void;
    protected doAuth(cnt: AuthContent, suc: () => void, err: (err: Error) => void): void;
    static UID: string;
    login(cnt: LoginContent): void;
    share(cnt: ShareContent): void;
    pay(cnt: PayContent): void;
    protected doPay(cnt: PayContent): void;
    audio(cnt: AudioContent): void;
    image(cnt: ImageContent): void;
}
