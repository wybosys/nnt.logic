declare module 'mosca' {

    class Server {
        constructor(setting: any);

        on(msg: "ready" | "error", callback: (err?: any) => void): void;

        close(): void;
    }
}