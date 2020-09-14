import qr = require("qr-image");
import {Stream} from "../core/stream";

export enum QROutpuType {
    SVG = 1,
    PNG = 2,
    EPS = 3,
    PDF = 4
};

function QrTypeStr(typ: QROutpuType): 'png' | 'svg' | 'eps' | 'pdf' {
    if (typ == QROutpuType.PNG)
        return 'png';
    if (typ == QROutpuType.SVG)
        return 'svg';
    if (typ == QROutpuType.EPS)
        return 'eps';
    if (typ == QROutpuType.PDF)
        return 'pdf';
    return null;
}

export class QrCode {

    static Generate(str: string, typ = QROutpuType.PNG): Promise<Stream> {
        return new Promise(resolve => {
            let t = qr.image(str, {type: QrTypeStr(typ)});
            let stm = new Stream();
            stm.bindRead(t);
            resolve(stm);
        });
    }
}