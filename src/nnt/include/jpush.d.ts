declare module "jpush-sdk" {

    interface PushResult {
        sendno: string;
        msg_id: string;
    }

    class Push {
        setPlatform(...args: string[]): this;

        setAudience(...args: any[]): this;

        setNotification(...args: any[]): this;

        send(cb: (err: Error, res: PushResult) => void): void;
    }

    class Client {
        push(): Push;
    }

    let ALL: string;

    function buildClient(appkey: string, appsecret: string): Client;

    function tag(...args: string[]): any;

    function alias(...args: string[]): any;

    function registration_id(...args: string[]): any;

    function ios(...args: any[]): any;

    function android(...args: any[]): any;
}