import {AbstractRender} from "./render";
import {Mime} from "../../core/file";
import {Transaction, TransactionSubmitOption} from "../transaction";
import {BytesBuilder} from "../../core/bytes";
import {asString, IndexedObject} from "../../core/kernel";
import {boolean_t, double_t, FieldOption, FP_KEY, integer_t, string_t} from "../../core/proto";
import {logger} from "../../core/logger";
import {toJson} from "../../core/json";
import {Multimap} from "../../core/map";

export class Bin extends AbstractRender {

    type = Mime.Type("bin");
    be: true;

    render(trans: Transaction, opt?: TransactionSubmitOption): Buffer {
        let bytes = new BytesBuilder();
        if (opt && opt.model) {
            if (opt.raw) {
                // 直接输出模型数据
                let str = asString(trans.model);
                Bin.WriteString(str, bytes);
                return bytes.buffer;
            }

            this.writeHeader(trans, bytes);
            Bin.WriteModel(trans.model, bytes);
        } else {
            this.writeHeader(trans, bytes);
            Bin.WriteModel(trans.model, bytes);
        }
        return bytes.trim().buffer;
    }

    protected writeHeader(trans: Transaction, bytes: BytesBuilder) {
        let header: IndexedObject = {};
        let cmid = trans.params["_cmid"];
        if (cmid != null)
            header["_cmid"] = cmid;
        let listen = trans.params["_listening"];
        if (listen != null)
            header["_listening"] = listen;
        header["code"] = trans.status;
        let str = toJson(header);
        Bin.WriteString(str, bytes);
    }

    static WriteString(str: string, bytes: BytesBuilder) {
        let buf = new Buffer(str, 'utf8');
        bytes.addUInt32(buf.byteLength).addBuffer(buf);
    }

    // 输出模型
    static WriteModel(mdl: any, bytes: BytesBuilder) {
        if (mdl == null) {
            bytes.addUInt32(0);
            return;
        }

        let fps = mdl[FP_KEY];
        if (fps == null) {
            bytes.addUInt32(0);
            return;
        }

        for (let key in fps) {
            let val = mdl[key];
            let fp: FieldOption = fps[key];
            bytes.addUInt32(fp.id);
            if (fp.valtype) {
                if (fp.array) {
                    let pos = bytes.offset;
                    bytes.addUInt32(0); // 输出尺寸的占位，之后再写回来
                    if (typeof fp.valtype == "string") {
                        if (fp.valtype == string_t) {
                            const ref: string[] = val;
                            ref.forEach(e => {
                                Bin.WriteString(e, bytes);
                            });
                        } else if (fp.valtype == integer_t) {
                            const ref: number[] = val;
                            ref.forEach(e => {
                                bytes.addInt32(e);
                            });
                        } else if (fp.valtype == double_t) {
                            const ref: number[] = val;
                            ref.forEach(e => {
                                bytes.addDouble(e);
                            });
                        } else if (fp.valtype == boolean_t) {
                            const ref: boolean[] = val;
                            ref.forEach(e => {
                                bytes.addInt8(e ? 1 : 0);
                            });
                        }
                    } else {
                        const ref: any[] = val;
                        ref.forEach(e => {
                            Bin.WriteModel(e, bytes);
                        });
                    }
                    // 回写真实尺寸
                    bytes.setUInt32(bytes.offset - pos, pos);
                } else if (fp.map) {
                    const ref: Map<any, any> = val;
                    let pos = bytes.offset;
                    bytes.addUInt32(0);
                    ref.forEach((v, k) => {
                        // 输出key
                        if (fp.keytype == string_t) {
                            Bin.WriteString(k, bytes);
                        } else if (fp.keytype == integer_t) {
                            bytes.addInt32(k);
                        } else if (fp.keytype == double_t) {
                            bytes.addDouble(k);
                        } else {
                            logger.fatal("遇到不支持的key类型");
                        }
                        // 输出val
                        if (typeof fp.valtype == "string") {
                            if (fp.valtype == string_t) {
                                Bin.WriteString(v, bytes);
                            } else if (fp.valtype == integer_t) {
                                bytes.addInt32(v);
                            } else if (fp.valtype == double_t) {
                                bytes.addDouble(v);
                            } else if (fp.valtype == boolean_t) {
                                bytes.addInt8(v ? 1 : 0);
                            }
                        } else {
                            Bin.WriteModel(v, bytes);
                        }
                    });
                    bytes.setUInt32(bytes.offset - pos, pos);
                } else if (fp.multimap) {
                    const ref: Multimap<any, any> = val;
                    let pos = bytes.offset;
                    bytes.addUInt32(0);
                    ref.forEach((v, k) => {
                        // 输出key
                        if (fp.keytype == string_t) {
                            Bin.WriteString(k, bytes);
                        } else if (fp.keytype == integer_t) {
                            bytes.addInt32(k);
                        } else if (fp.keytype == double_t) {
                            bytes.addDouble(k);
                        } else {
                            logger.fatal("遇到不支持的key类型");
                        }
                        // 输出val
                        if (typeof fp.valtype == "string") {
                            if (fp.valtype == string_t) {
                                const ref: string[] = v;
                                ref.forEach(e => {
                                    Bin.WriteString(e, bytes);
                                });
                            } else if (fp.valtype == integer_t) {
                                const ref: number[] = v;
                                ref.forEach(e => {
                                    bytes.addInt32(e);
                                });
                            } else if (fp.valtype == double_t) {
                                const ref: number[] = v;
                                ref.forEach(e => {
                                    bytes.addDouble(e);
                                });
                            } else if (fp.valtype == boolean_t) {
                                const ref: boolean[] = v;
                                ref.forEach(e => {
                                    bytes.addInt8(e ? 1 : 0);
                                });
                            }
                        } else {
                            Bin.WriteModel(v, bytes);
                        }
                    });
                    bytes.setUInt32(bytes.offset - pos, pos);
                } else if (fp.enum) {
                    bytes.addInt32(val);
                } else {
                    Bin.WriteModel(val, bytes);
                }
            } else {
                if (fp.string) {
                    Bin.WriteString(val, bytes);
                } else if (fp.integer) {
                    bytes.addInt32(val);
                } else if (fp.double) {
                    bytes.addDouble(val);
                } else if (fp.boolean) {
                    bytes.addInt8(val ? 1 : 0);
                } else if (fp.enum) {
                    bytes.addInt32(val);
                } else if (fp.json) {
                    Bin.WriteString(toJson(val), bytes);
                } else {
                    Bin.WriteModel(val, bytes);
                }
            }
        }
    }
}