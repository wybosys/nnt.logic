import {DecoderMsgType, IDecoder} from "./decoder";
import {IndexedObject, toJsonObject} from "../../core/kernel";
import {FindRender} from "../render/render";

export class JsonDecoder implements IDecoder {

    render = FindRender("json");

    decode(msg: DecoderMsgType): IndexedObject {
        let str = msg.toString();
        return toJsonObject(str);
    }
}