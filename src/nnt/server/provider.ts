import {action, IRouter} from "../core/router";
import {Transaction} from "./transaction";
import {STATUS} from "../core/models";
import {StringT} from "../core/stringt";
import {Config} from "../manager/config";
import {logger} from "../core/logger";
import {RespFile} from "./file";
import {expand} from "../core/url";
import {Mime} from "../core/file";
import {enumerate, enumm, input, model, string} from "../core/proto";
import fs = require("fs");
import mini = require("minify");
import zlib = require("zlib");

// 返回的数据格式
@model([enumm])
export class ProviderContentType {

    // 原始格式
    static RAW = 0;

    // 按照纯js格式返回，可以直接用在script元素中
    static JAVASCRIPT = 1;

    // 返回字符串形式，方便客户端eval操作
    static STRING = 2;
}

// 配合sdk的客户端组件提供模式
@model()
export class ProviderContent {

    @enumerate(1, ProviderContentType, [input], "输出类型")
    type: number;

    @string(2, [input], "请求返回的脚本id")
    id: string;
}

export class Provider implements IRouter {
    action = "provider";

    @action(ProviderContent)
    async use(trans: Transaction) {
        let m: ProviderContent = trans.model;
        if (!providers.has(m.id)) {
            trans.status = STATUS.TARGET_NOT_FOUND;
            trans.submit();
            return;
        }
        // 如果是请求原始格式，则直接去拉取
        trans.gzip = true;
        let pf = providers.get(m.id);
        if (pf.loaded) {
            let fdir = Config.CACHE + "/provider";
            let js = fdir + "/" + pf.name + ".js";
            let txt = fdir + "/" + pf.name + ".txt";
            if (m.type == ProviderContentType.JAVASCRIPT)
                trans.output(Mime.Type(".js"), RespFile.Regular(js));
            else
                trans.output(Mime.Type(".txt"), RespFile.Regular(txt));
        } else {
            if (!fs.existsSync(pf.file)) {
                logger.fatal("没有找到注册的provider文件 {{=it.file}}", {file: pf.file});
                trans.status = STATUS.FILE_NOT_FOUND;
                trans.submit();
                return;
            }
            // 请求原始文件，不做cache
            if (m.type == ProviderContentType.RAW) {
                trans.gzip = false;
                trans.output(await Mime.TypeOfFile(pf.file), RespFile.Regular(pf.file));
                return;
            }
            let fdir = Config.CACHE + "/provider";
            if (!fs.existsSync(fdir))
                fs.mkdirSync(fdir);
            pf.name = StringT.Hash(pf.file).toString();
            // 生成客户端可以接受的格式
            let js = fdir + "/" + pf.name + ".js";
            let txt = fdir + "/" + pf.name + ".txt";
            mini(pf.file, (err, data) => {
                zlib.gzip(new Buffer(data), (err, zip) => {
                    // js可以直接保存
                    fs.writeFileSync(js, zip);

                    // 保存普通文本
                    // text需要对\和"进行转换
                    data = data.replace(/\\/g, "\\\\");
                    data = data.replace(/\n/g, "");
                    data = data.replace(/"/g, "\\\"");
                    zlib.gzip(new Buffer(data), (err, zip) => {
                        fs.writeFileSync(txt, zip);
                        trans.compressed = true;

                        // 返回请求的文件
                        pf.loaded = true;
                        if (m.type == ProviderContentType.JAVASCRIPT) {
                            trans.output(Mime.Type(".js"), RespFile.Regular(js));
                        } else {
                            trans.output(Mime.Type(".txt"), RespFile.Regular(txt));
                        }
                    });
                });
            });
        }
    }
}

class ProviderFile {
    key: string;
    file: string;
    name: string;
    loaded: boolean;
}

let providers = new Map<string, ProviderFile>();

// 注册一个提供器，如果key重复，则是覆盖
export function RegisterProvider(key: string, file: string) {
    let t = new ProviderFile();
    t.key = key;
    t.file = expand(file);
    providers.set(key, t);
}

// 注册mp3处理器
RegisterProvider("mp3encoder.js", "~/3rd/mp3encoder.js");
