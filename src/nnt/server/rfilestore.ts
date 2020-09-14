import {action, IRouter} from "../core/router";
import {enumerate, enumm, input, model, optional, output, string} from "../core/proto";
import {Mime} from "../core/file";
import {IndexedObject, toInt} from "../core/kernel";
import {IMediaStore} from "./imediastore";
import {static_cast} from "../core/core";
import {logger} from "../core/logger";
import {Config, IsDebug} from "../manager/config";
import {Transaction} from "./transaction";
import {STATUS} from "../core/models";
import {FileInfo} from "./fileinfo";
import {RespFile} from "./file";
import {UUID} from "../core/random";
import {Fs} from "../core/fs";
import Hashids = require("hashids");
import fs = require("fs-extra");
import req = require("request");
import childproc = require("child_process");

// 使用类型来模拟枚举
@model([enumm])
export class FileSupport {
    static PLAIN = 0;
    static PDF = 1;
    static EPUB = 2;
}

@model()
export class DownloadFile {

    @enumerate(1, FileSupport, [input, optional], "文件类型")
    type?: number;

    @string(2, [input], "源")
    source: string;

    @string(3, [output], "文件在服务器上的路径")
    path: string;

    @string(4, [input, optional], "unsafe模式下，文件的保存目录")
    directory: string;
}

@model()
export class GetFile {

    @enumerate(1, FileSupport, [input, optional], "文件类型")
    type?: number;

    @string(2, [input], "文件名")
    name: string;
}

export class RFileStore implements IRouter {
    action = "filestore";
    hash = new Hashids("filestore");

    constructor() {
        this.supports[FileSupport.PLAIN] = [
            Mime.Type('txt')
        ];
        this.supports[FileSupport.PDF] = [
            Mime.Type('pdf')
        ];
        this.supports[FileSupport.EPUB] = [
            Mime.Type('epub')
        ];
    }

    protected supports: IndexedObject = {};

    protected doUnsafeDownload(srv: IMediaStore, src: string, directory: string): Promise<string> {
        return new Promise(resolve => {
            // 保证存在
            let dirpath = srv.store + "/" + directory + "/";
            if (!fs.existsSync(dirpath))
                fs.mkdirsSync(dirpath);

            // 目标文件的路径
            let nm = UUID();
            let path = dirpath + nm;

            // 使用wget下载
            let wget = `wget "${src}" -O "${path}" --timeout=5 --user-agent="Mozilla/5.0 (iPhone; CPU iPhone OS 10_3_1 like Mac OS X) AppleWebKit/603.1.30 (KHTML, like Gecko) Version/10.0 Mobile/14E304 Safari/602.1"`;
            childproc.exec(wget, (err, stdout, stderr) => {
                if (err) {
                    logger.error(err);
                    resolve(null);
                } else {
                    Mime.TypeOfFile(path).then(typ => {
                        if (!typ) {
                            logger.warn("没有找到下载的对象类型");
                            resolve(null);
                        } else {
                            let ext = "." + Mime.Extension(typ);
                            Fs.move(path, path + ext, err => {
                                if (err)
                                    logger.error(err);
                            });
                            let result = directory + "/" + nm + ext;
                            logger.log(`文件下载成功 ${result}`);
                            resolve(result);
                        }
                    });
                }
            });
        });
    }

    protected doDownload(srv: IMediaStore, src: string, pat: string[], directory: string): Promise<string> {
        return new Promise(resolve => {
            if (!srv.unsafe) {
                // 按照日期格式保存到目录中
                let today = new Date();
                directory = this.hash.encode(today.getFullYear(), today.getMonth(), today.getDay());
            }

            // 保证存在
            let dirpath = srv.store + "/" + directory + "/";
            if (!fs.existsSync(dirpath))
                fs.mkdirsSync(dirpath);

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
                                // 带ext改名
                                Fs.move(path, path + ext, err => {
                                    if (err)
                                        logger.error(err);
                                });
                                resolve(directory + "/" + nm + ext);
                            } else {
                                logger.warn("没有找到下载的对象类型");
                                resolve(null);
                            }
                        } else if (pat.indexOf(typ) == -1) {
                            logger.warn("下载的文件类型不匹配 " + typ);
                            resolve(null);
                        } else {
                            Fs.move(path, path + ext, err => {
                                if (err)
                                    logger.error(err);
                            });
                            resolve(directory + "/" + nm + ext);
                        }
                    });
                }));
        });
    }

    @action(DownloadFile)
    download(trans: Transaction) {
        trans.timeout(-1);

        let srv = static_cast<IMediaStore>(trans.server);
        let m: DownloadFile = trans.model;
        if (srv.unsafe) {
            this.doUnsafeDownload(srv, m.source, m.directory).then(output => {
                if (!output)
                    trans.status = STATUS.FAILED;
                else
                    m.path = output;
                trans.submit();
            });
            return;
        }

        if (m.type == null)
            m.type = FileSupport.PLAIN;
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
                    logger.error(err);
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
                this.doDownload(srv, m.source, pat, m.directory).then(output => {
                    if (!output)
                        trans.status = STATUS.FAILED;
                    else
                        m.path = output;
                    trans.submit();
                });
            });
        } else {
            logger.log("开始下载 " + m.source);

            // 可以开始下载
            this.doDownload(srv, m.source, pat, m.directory).then(output => {
                if (!output)
                    trans.status = STATUS.FAILED;
                else
                    m.path = output;
                trans.submit();
            });
        }
    }

    @action(GetFile)
    use(trans: Transaction) {
        let srv = static_cast<IMediaStore>(trans.server);
        let m: GetFile = trans.model;
        let typ = Mime.Type(m.name);
        if (!typ) {
            trans.status = STATUS.FILE_NOT_FOUND;
            trans.submit();
            return;
        }
        if (m.type == null)
            m.type = FileSupport.PLAIN;
        let pat = this.supports[m.type];

        // 判断上传的类型是否正确
        if (!pat || pat.indexOf(typ) == -1) {
            trans.status = STATUS.TYPE_MISMATCH;
            trans.submit();
            return;
        }

        // 关闭压缩
        trans.gzip = false;
        trans.compressed = true;

        let info = new FileInfo();
        info.name = m.name;
        info.storedir = srv.store;
        info.input = srv.store + "/" + m.name;
        if (!fs.existsSync(info.input)) {
            trans.status = STATUS.FILE_NOT_FOUND;
            trans.submit();
            return;
        }
        trans.output(typ, RespFile.Regular(info.input));
    }
}
