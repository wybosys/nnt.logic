import {DecoderMsgType, IDecoder} from "./decoder";
import {IndexedObject, toJsonObject} from "../../core/kernel";
import {FindRender} from "../render/render";
import {FindParser} from "../parser/parser";

export class JsonDecoder implements IDecoder {

    render = FindRender("json");
    parser = FindParser("jsobj");

    decode(msg: DecoderMsgType): IndexedObject {
        let str = msg.toString();
        return toJsonObject(str);
    }
}