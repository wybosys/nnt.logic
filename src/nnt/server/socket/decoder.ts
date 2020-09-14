import {IndexedObject} from "../../core/kernel";
import ws = require("ws");

export type DecoderMsgType = ws.Data;

export interface IDecoder {

    // 解析传入的数据
    decode(msg: DecoderMsgType): IndexedObject;
}

// method到transcation的处理器
let decoders = new Map<string, IDecoder>();

export function RegisterDecoder(url: string, obj: IDecoder) {
    decoders.set(url, obj);
}

export function FindDecoder(url: string): IDecoder {
    return decoders.get(url);
}
