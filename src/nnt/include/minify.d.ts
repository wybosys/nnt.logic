declare module "minify" {

    function m(file: string, cb: (err: Error, data: string) => void): void;

    export = m;
}