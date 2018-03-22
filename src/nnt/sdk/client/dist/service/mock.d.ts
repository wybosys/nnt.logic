import { AudioContent, AuthContent, ImageContent, InfoContent, LoginContent, PayContent, Service, ShareContent } from "../service";
export declare class MockService extends Service {
    prepare(cnt: InfoContent, cb: () => void): void;
    auth(cnt: AuthContent): void;
    login(cnt: LoginContent): void;
    pay(cnt: PayContent): void;
    share(cnt: ShareContent): void;
    audio(cnt: AudioContent): void;
    image(cnt: ImageContent): void;
}
