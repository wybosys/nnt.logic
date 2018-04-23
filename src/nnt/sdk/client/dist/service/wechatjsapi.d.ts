import { AudioContent, ImageContent, InfoContent, PayContent, ShareContent } from "../service";
import { NntService } from "./nnt";
export declare class WechatJsApi extends NntService {
    prepare(info: InfoContent, cb: () => void): void;
    share(cnt: ShareContent): void;
    protected _doConfig(suc: () => void, error: (err: Error) => void): void;
    private _prevurl;
    audio(cnt: AudioContent): void;
    image(cnt: ImageContent): void;
    doPay(cnt: PayContent): void;
}
