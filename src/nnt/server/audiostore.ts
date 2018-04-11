import {Rest} from "./rest";
import {action, IRouter} from "../core/router";
import {Node} from "../config/config";
import {enumerate, enumm, file, input, model, optional, output, string} from "../core/proto";
import {expand, pathd} from "../core/url";
import {Fs, IndexedObject, toInt} from "../core/kernel";
import {Transaction} from "./transaction";
import {STATUS} from "../core/models";
import {Base64File, Mime} from "../core/file";
import {static_cast, UUID} from "../core/core";
import {logger} from "../core/logger";
import {RespFile} from "./file";
import {Config, IsDebug} from "../manager/config";
import fs = require("fs");
import Hashids = require("hashids");
import req = require("request");
import ffmpeg = require("fluent-ffmpeg");
import path = require("path");

@model([enumm])
export class AudioSupport {
    static MP3 = 0;
    static SPX = 1;
    static AMR = 2;
}

@model()
export class GetAudio {

    @enumerate(1, AudioSupport, [input, optional], "文件类型")
    type?: number;

    @string(2, [input], "文件名")
    name: string;
}

@model()
export class UploadAudio {

    @enumerate(1, AudioSupport, [input, optional], "文件类型")
    type?: number;

    @file(2, [input], "文件对象")
    file: any;

    @string(3, [output], "文件在服务器上的路径")
    path: string;
}

@model()
export class DownloadAudio {

    @enumerate(1, AudioSupport, [input, optional], "文件类型")
    type?: number;

    @string(2, [input], "源")
    source: string;

    @string(3, [output], "文件在服务器上的路径")
    path: string;
}

const PAT_AUDIOSTOREPATH = /^[0-9A-Za-z-+]+\/[0-9A-Za-z-+\.]+$/;

function IsAudioStorePath(path: string): boolean {
    return path.match(PAT_AUDIOSTOREPATH) != null;
}

interface AudioUploadResult {
    status: number,
    path?: string
}

export class RAudioStore implements IRouter {
    action = "audiostore";
    hash = new Hashids("audiostore");

    constructor() {
        this.supports[AudioSupport.MP3] = [
            Mime.Type('mp3')
        ];
        this.supports[AudioSupport.SPX] = [
            Mime.Type('spx')
        ];
        this.supports[AudioSupport.AMR] = [
            Mime.Type('amr'),
            "application/octet-stream"
        ];
    }

    protected supports: IndexedObject = {};

    @action(UploadAudio)
    async upload(trans: Transaction) {
        trans.timeout(-1); // 上传媒体文件通常会花费较长时间，所以不设置超时等待

        let m: UploadAudio = trans.model;
        let srv = static_cast<AudioStore>(trans.server);
        if (m.type == null)
            m.type = AudioSupport.MP3;

        let pat = this.supports[m.type];
        if (!pat) {
            trans.status = STATUS.TYPE_MISMATCH;
            trans.submit();
            return;
        }

        if (typeof m.file == 'string') {
            if (IsAudioStorePath(m.file)) {
                m.path = m.file;
                trans.submit();
                return;
            }

            // 处理base64格式的数据
            let f = Base64File.Decode(m.file);
            if (f) {
                if (pat.indexOf(f.type) == -1) {
                    trans.status = STATUS.TYPE_MISMATCH;
                    trans.submit();
                    return;
                }
                let result = await this.doUploadBinary(srv, f.buffer, f.type, pat);
                result = await this.doConvertUpload(srv, m.type, result);
                m.path = result.path;
                trans.status = result.status;
                trans.submit();
                return;
            }

            // 处理2进制格式
            let result = await this.doUploadBinary(srv, new Buffer(m.file, "ascii"), pat[0], pat);
            result = await this.doConvertUpload(srv, m.type, result);
            m.path = result.path;
            trans.status = result.status;
            trans.submit();
        }
        else if (typeof m.file == "object") {
            if (pat.indexOf(m.file.type) == -1) {
                trans.status = STATUS.TYPE_MISMATCH;
                trans.submit();
                return;
            }

            let srcf = (<any>m.file)["path"];
            let typ = await Mime.TypeOfFile(srcf);
            if (!typ) {
                // 如果是开发版本，则允许继续上传
                if (IsDebug()) {
                    let result = await this.doUploadFile(srv, m.file);
                    result = await this.doConvertUpload(srv, m.type, result);
                    m.path = result.path;
                    trans.status = result.status;
                    trans.submit();
                }
                else {
                    trans.status = STATUS.UPLOAD_FAILED;
                    trans.submit();
                }
            }
            else if (pat.indexOf(typ) == -1) {
                trans.status = STATUS.TYPE_MISMATCH;
                trans.submit();
            }
            else {
                let result = await this.doUploadFile(srv, m.file);
                result = await this.doConvertUpload(srv, m.type, result);
                m.path = result.path;
                trans.status = result.status;
                trans.submit();
            }
        }
        else {
            trans.status = STATUS.TYPE_MISMATCH;
            trans.submit();
        }
    }

    protected doUploadBinary(srv: AudioStore, buffer: Buffer, type: string, pat: string[]): Promise<AudioUploadResult> {
        return new Promise(resolve => {
            // 按照日期格式保存到目录中
            let today = new Date();
            let dir = this.hash.encode(today.getFullYear(), today.getMonth(), today.getDay());
            let dirpath = srv.store + "/" + dir + "/";
            if (!fs.existsSync(dirpath))
                fs.mkdirSync(dirpath);

            // 保存文件，并生成文件名
            let nm = UUID() + "." + Mime.Extension(type);
            let path = dirpath + nm;

            // 根据内容判断文件是不是可以保存
            fs.writeFile(path, buffer, err => {
                if (err) {
                    logger.exception(err);
                    resolve({
                        status: STATUS.FILESYSTEM_FAILED
                    });
                    return;
                }

                Mime.TypeOfFile(path).then(typ => {
                    if (!typ) {
                        if (IsDebug()) {
                            resolve({
                                status: STATUS.OK,
                                path: dir + "/" + nm
                            });
                        }
                        else {
                            // 删除该文件
                            fs.unlink(path, () => {
                                logger.info("上传的文件格式不匹配");
                            });
                            resolve({
                                status: STATUS.TYPE_MISMATCH
                            });
                        }
                    }
                    else {
                        if (pat.indexOf(typ) == -1) {
                            fs.unlink(path, () => {
                                logger.info("上传的文件格式不匹配");
                            });
                            resolve({
                                status: STATUS.TYPE_MISMATCH
                            });
                        }
                        else {
                            resolve({
                                status: STATUS.OK,
                                path: dir + "/" + nm
                            });
                        }
                    }
                });
            });
        });
    }

    protected doUploadFile(srv: AudioStore, file: IndexedObject): Promise<AudioUploadResult> {
        return new Promise(resolve => {
            let srcf = file.path;

            // 按照日期格式保存到目录中
            let today = new Date();
            let dir = this.hash.encode(today.getFullYear(), today.getMonth(), today.getDay());
            let dirpath = srv.store + "/" + dir + "/";
            if (!fs.existsSync(dirpath))
                fs.mkdirSync(dirpath);

            // 保存文件，并生成文件名
            let nm = UUID() + "." + Mime.Extension(file.type);
            let path = dirpath + nm;
            Fs.move(srcf, path, err => {
                if (err) {
                    logger.exception(err);
                    resolve({
                        status: STATUS.FILESYSTEM_FAILED
                    });
                }
                else {
                    resolve({
                        status: STATUS.OK,
                        path: dir + "/" + nm
                    });
                }
            });
        });
    }

    // 比如amr，客户端期望上传完成后，自动生成mp3再传回
    protected doConvertUpload(srv: AudioStore, typ: AudioSupport, result: AudioUploadResult): Promise<AudioUploadResult> {
        return new Promise(resolve => {
            if (result.status != STATUS.OK) {
                resolve(result);
                return;
            }

            // 自动转换成mp3
            if (typ == AudioSupport.AMR) {
                let mp3 = result.path.replace(path.extname(result.path), ".mp3");
                let hdl = ffmpeg(srv.store + "/" + result.path);
                // 如果是windows，设置随时携带的处理器
                if (process.platform == "win32") {
                    let dir = expand("~/3rd/ffmpeg");
                    hdl.setFfmpegPath(dir + "/ffmpeg.exe")
                        .setFfprobePath(dir + "/ffprobe.exe");
                }
                hdl.output(srv.store + "/" + mp3)
                    .on("error", err => {
                        logger.error(err);
                        resolve({
                            status: STATUS.FAILED
                        });
                    })
                    .on("end", () => {
                        resolve({
                            status: STATUS.OK,
                            path: mp3
                        });
                    })
                    .run();
                return;
            }

            resolve(result);
        });
    }

    @action(GetAudio)
    use(trans: Transaction) {
        let srv = static_cast<AudioStore>(trans.server);
        let m: GetAudio = trans.model;
        let typ = Mime.Type(m.name);
        if (!typ) {
            trans.status = STATUS.FILE_NOT_FOUND;
            trans.submit();
            return;
        }
        if (m.type == null)
            m.type = AudioSupport.MP3;
        let input = srv.store + "/" + m.name;
        if (!fs.existsSync(input)) {
            trans.status = STATUS.FILE_NOT_FOUND;
            trans.submit();
            return;
        }
        // 如果获取的是amr，则自动转成mp3
        if (typ == "audio/amr") {
            let dir = path.dirname(m.name);
            let fn = path.basename(m.name).replace(".amr", ".mp3");
            let tgtdir = srv.store + "/convert/" + dir + "/";
            let tgt = tgtdir + fn;
            if (fs.existsSync(tgt)) {
                trans.output("audio/mpeg", RespFile.Regular(tgt));
            }
            else {
                if (!fs.existsSync(tgtdir))
                    fs.mkdirSync(tgtdir);
                logger.log("自动转换amr到mp3 " + m.name);
                let hdl = ffmpeg(input);
                // 如果是windows，设置随时携带的处理器
                if (process.platform == "win32") {
                    let dir = expand("~/3rd/ffmpeg");
                    hdl.setFfmpegPath(dir + "/ffmpeg.exe")
                        .setFfprobePath(dir + "/ffprobe.exe");
                }
                hdl.output(tgt)
                    .on("error", err => {
                        logger.error(err);
                        trans.status = STATUS.FAILED
                        trans.submit();
                    })
                    .on("end", () => {
                        trans.output("audio/mpeg", RespFile.Regular(tgt));
                    })
                    .run();
            }
        }
        else {
            trans.output(typ, RespFile.Regular(input));
        }
    }

    @action(DownloadAudio)
    download(trans: Transaction) {
        trans.timeout(-1);

        let srv = static_cast<AudioStore>(trans.server);
        let m: DownloadAudio = trans.model;
        if (m.type == null)
            m.type = AudioSupport.MP3;
        let pat = this.supports[m.type];
        if (!pat) {
            trans.status = STATUS.TYPE_MISMATCH;
            trans.submit();
            return;
        }

        if (!trans.ace || trans.ace.quota) {
            // 先连接上，看看文件有没有超出限制
            req.head(m.source, (err, rsp) => {
                if (err) {
                    logger.warn(m.source + " 下载失败");
                    trans.status = STATUS.FILESYSTEM_FAILED;
                    trans.submit();
                    return;
                }

                let tgtsz = toInt(rsp.headers["content-length"]);
                if (tgtsz > Config.FILESIZE_LIMIT) {
                    logger.warn(m.source + " 超出大小限制");
                    trans.status = STATUS.LENGTH_OVERFLOW;
                    trans.submit();
                    return;
                }

                logger.log("开始下载 " + m.source);

                // 可以开始下载
                this.doDownload(srv, m.source, pat).then(output => {
                    if (!output)
                        trans.status = STATUS.FAILED;
                    else
                        m.path = output;
                    trans.submit();
                });
            });
        }
        else {
            logger.log("开始下载 " + m.source);

            // 可以开始下载
            this.doDownload(srv, m.source, pat).then(output => {
                if (!output)
                    trans.status = STATUS.FAILED;
                else
                    m.path = output;
                trans.submit();
            });
        }
    }

    protected doDownload(srv: AudioStore, src: string, pat: string[]): Promise<string> {
        return new Promise(resolve => {
            // 按照日期格式保存到目录中
            let today = new Date();
            let dir = this.hash.encode(today.getFullYear(), today.getMonth(), today.getDay());
            let dirpath = srv.store + "/" + dir + "/";
            if (!fs.existsSync(dirpath))
                fs.mkdirSync(dirpath);

            // 目标文件的路径
            let nm = UUID();
            let path = dirpath + nm;
            let ext: string;

            req.get(src)
                .on("response", resp => {
                    let typ = resp.headers["content-type"];
                    ext = "." + Mime.Extension(typ);
                })
                .on("error", err => {
                    logger.error(err);
                    resolve(null);
                })
                .pipe(fs.createWriteStream(path).on("finish", () => {
                    Mime.TypeOfFile(path).then(typ => {
                        if (!typ) {
                            // 如果是开发版本，则允许继续上传
                            if (IsDebug()) {
                                Fs.move(path, path + ext, err => {
                                    if (err)
                                        logger.error(err);
                                });
                                resolve(dir + "/" + nm + ext);
                            }
                            else {
                                logger.warn("没有找到下载的对象类型");
                                resolve(null);
                            }
                        }
                        else if (pat.indexOf(typ) == -1) {
                            logger.warn("下载的文件类型不匹配 " + typ);
                            resolve(null);
                        }
                        else {
                            Fs.move(path, path + ext, err => {
                                if (err)
                                    logger.error(err);
                            });
                            resolve(dir + "/" + nm + ext);
                        }
                    });
                }));
        });
    }
}

interface AudioStoreNode extends Node {
    // 存储位置
    store: string;
}

export class AudioStore extends Rest {

    constructor() {
        super();
        this.routers.register(new RAudioStore());
    }

    @pathd()
    store: string;

    config(cfg: Node): boolean {
        if (!super.config(cfg))
            return false;
        let c = <AudioStoreNode>cfg;
        if (!c.store)
            return false;
        this.store = c.store;
        return true;
    }

    async start(): Promise<void> {
        await super.start();
        if (!fs.existsSync(this.store))
            fs.mkdirSync(this.store);
    }
}