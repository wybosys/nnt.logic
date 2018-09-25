import {IndexedObject} from "../../core/kernel";
import ws = require("ws");
import {AbstractRender} from "../render/render";

export type DecoderMsgType = ws.Data;

export interface IDecoder {

    // 解析传入的数据
    decode(msg: DecoderMsgType): IndexedObject;

    // 用来返回输出的数据
    render: AbstractRender;
}