import { NntService } from "./nnt";
import { AudioContent, AudioRecorder, AuthContent, PayContent, ShareContent } from "../service";
import { IMedia } from "../media";
export declare class ApiCldService extends NntService {
    static SHARE_SCENE: string;
    auth(cnt: AuthContent): void;
    share(cnt: ShareContent): void;
    protected doPay(cnt: PayContent): void;
    private payByWeixin(pay, cnt);
    private payByApple(pay, cnt);
    audio(cnt: AudioContent): void;
}
export declare class ApicldAudioRecorder extends AudioRecorder {
    start(cb?: (err: Error) => void): void;
    stop(cb?: (media?: IMedia) => void): void;
    play(cb?: (err: Error) => void): void;
}
