declare module "level" {
    class Level {
        put(key: any, val: any, cb: (err: Error) => void): void;

        get(key: any, cb: (err: Error, val: any) => void): void;

        del(key: any, cb: (err: Error) => void): void;

        open(cb: (err: Error) => void): void;

        close(cb: (err: Error) => void): void;
    }

    function level(file: string): Level;

    export = level;
}
