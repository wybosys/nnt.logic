declare module 'hashids' {

    class Hashids {
        constructor(key?: string);

        encode(...val: any[]): string;
    }

    export = Hashids;
}
