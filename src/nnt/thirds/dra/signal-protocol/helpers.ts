export class Util {

    static ToString(obj: any): string {
        if (typeof obj == "string")
            return obj;
        return Buffer.from(obj).toString('binary');
    }

    static ToArrayBuffer(obj: any): ArrayBuffer {
        return null;
    }

}