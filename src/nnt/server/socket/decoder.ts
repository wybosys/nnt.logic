import {IndexedObject} from "../../core/kernel";
import {IRender} from "../../render/render";
import ws = require("ws");

export type DecoderMsgType = ws.Data;

export interface IDecoder {

    // 解析传入的数据
    decode(msg: DecoderMsgType): IndexedObject;

    // 用来返回输出的数据
    render: IRender;
}