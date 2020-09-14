import {IndexedObject, jsonobj} from "./kernel";
import {logger} from "./logger";

// 创建一个纯Json对象
export function JsonObject<T>(): T {
    return Object.create(null);
}

export function toJson(o: IndexedObject, def: string = null) {
    let r: string;
    try {
        r = JSON.stringify(o);
    } catch (err) {
        r = def;
    }
    return r;
}

export function toJsonObject(o: jsonobj, def: any = null): IndexedObject {
    let t = typeof (o);
    if (t == 'string') {
        if (o == "undefined" || o == "null")
            return def;
        let r: any;
        try {
            r = JSON.parse(o as string);
        } catch (err) {
            if (o.length > 128)
                o = o.substr(0, 128);
            logger.log(o + " " + err);
            r = def;
        }
        return r;
    } else if (t == 'object')
        return <any>o;
    return def;
}

export function toJsonArray(o: jsonobj, def: any[] = null): IndexedObject[] {
    let t = typeof (o);
    if (t == 'string') {
        if (o == "undefined" || o == "null")
            return def;
        let r: any;
        try {
            r = JSON.parse(o as string);
        } catch (err) {
            if (o.length > 128)
                o = o.substr(0, 128);
            logger.log(o + " " + err);
            r = def;
        }
        return r;
    } else if (t == 'object')
        return <any>o;
    return def;
}
