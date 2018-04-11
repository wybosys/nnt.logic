import {enumerate, enumm, file, FileType, input, model, optional, output, string} from "../core/proto";
import {action, IRouter} from "../core/router";
import {Rest} from "./rest";
import {Node} from "../config/config";
import {pathd} from "../core/url";
import {Transaction} from "./transaction";
import {static_cast, UUID} from "../core/core";
import {logger} from "../core/logger";
import {Filter} from "./imgfilter/filter";
import {STATUS} from "../core/models";
import {Fs, IndexedObject, toInt} from "../core/kernel";
import {RespFile} from "./file";
import {Config, IsDebug} from "../manager/config";
import {Mime} from "../core/file";
import {ConvertFile, FindSupportConvertor} from "./convert/convert";
import {FileInfo} from "./fileinfo";
import {QrCode} from "../component/qrcode";
import Hashids = require("hashids");
import fs = require("fs");
import ph = require("path");
import req = require("request");

// 使用类型来模拟枚举
@model([enumm])
export class ImageSupport {
    static IMAGE = 0;
}

@model()
export class UploadFile {

    @enumerate(1, ImageSupport, [input, optional], "文件类型")
    type?: number;

    @file(2, [input], "文件对象")
    file: FileType;

    @string(3, [output], "文件在服务器上的路径")
    path: string;
}

@model()
export class DownloadFile {

    @enumerate(1, ImageSupport, [input, optional], "文件类型")
    type?: number;

    @string(2, [input], "源")
    source: string;

    @string(3, [output], "文件在服务器上的路径")
    path: string;
}

@model()
export class GetFile {

    @enumerate(1, ImageSupport, [input, optional], "文件类型")
    type?: number;

    @string(2, [input], "文件名")
    name: string;

    @string(3, [input, optional], "滤镜")
    filter: string;
}

@model()
export class QrCodeGenerate {

    @string(1, [input], "内容")
    content: string;
}

// 是否是图床产生的文件
const PAT_IMAGESTOREPATH = /^[0-9A-Za-z-+]+\/[0-9A-Za-z-+\.]+$/;

function IsImageStorePath(path: string): boolean {
    return path.match(PAT_IMAGESTOREPATH) != null;
}

export class RImageStore implements IRouter {
    action = "imagestore";
    hash = new Hashids("imagestore");

    constructor() {
        this.supports[ImageSupport.IMAGE] = [
            Mime.Type('jpg'),
            Mime.Type('jpeg'),
            Mime.Type('png')
        ];
    }

    protected supports: IndexedObject = {};

    @action(UploadFile)
    async upload(trans: Transaction) {
        let m: UploadFile = trans.model;

        if (typeof m.file == "string") {
            if (IsImageStorePath(m.file)) {
                m.path = m.file;
                trans.submit();
                return;
            }
            else {
                trans.status = STATUS.TYPE_MISMATCH;
                trans.submit();
                return;
            }
        }
        else if (typeof m.file != "object") {
            trans.status = STATUS.TYPE_MISMATCH;
            trans.submit();
            return;
        }

        if (m.type == null)
            m.type = ImageSupport.IMAGE;
        let pat = this.supports[m.type];
        // 判断上传的类型是否正确
        if (!pat || pat.indexOf(m.file.type) == -1) {
            trans.status = STATUS.TYPE_MISMATCH;
            trans.submit();
            return;
        }

        // 判断文件中探出的类型是否支持
        let srcf = (<any>m.file)["path"];
        let typ = await Mime.TypeOfFile(srcf);
        if (!typ) {
            // 如果是开发版本，则允许继续上传
            if (IsDebug()) {
                this.doUpload(trans);
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
            this.doUpload(trans);
        }
    }

    protected doUpload(trans: Transaction) {
        let m: UploadFile = trans.model;
        let srv = static_cast<ImageStore>(trans.server);
        let file = m.file as IndexedObject;
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
                trans.status = STATUS.FILESYSTEM_FAILED;
                trans.submit();
            }
            else {
                m.path = dir + "/" + nm;
                trans.submit();
            }
        });
    }

    protected doDownload(srv: ImageStore, src: string, pat: string[]): Promise<string> {
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
                                // 带ext改名
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

    // 限制为不下载大于10m的图片
    @action(DownloadFile)
    download(trans: Transaction) {
        trans.timeout(-1);

        let srv = static_cast<ImageStore>(trans.server);
        let m: DownloadFile = trans.model;
        if (m.type == null)
            m.type = ImageSupport.IMAGE;
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

    @action(ConvertFile)
    convert(trans: Transaction) {
        let srv = static_cast<ImageStore>(trans.server);
        let m: ConvertFile = trans.model;
        // 查找对应的转换器
        let cvt = FindSupportConvertor(m);
        if (!cvt) {
            trans.status = STATUS.TYPE_MISMATCH;
            trans.submit();
            return;
        }
        // 查找之前有没有转换
        let info = new FileInfo();
        info.name = m.output();
        info.storedir = srv.store + "/convert";
        info.output = info.storedir + "/" + info.name;
        m.path = "convert/" + info.name;
        if (!fs.existsSync(info.storedir))
            fs.mkdirSync(info.storedir);
        else if (fs.existsSync(info.output)) {
            trans.submit();
            return;
        }
        // 转换并保存
        cvt.convert(m, info, (err, path) => {
            if (err) {
                logger.error(err);
                trans.status = STATUS.FAILED;
            }
            m.path = path;
            trans.submit();
        });
    }

    @action(GetFile)
    use(trans: Transaction) {
        let srv = static_cast<ImageStore>(trans.server);
        let m: GetFile = trans.model;
        let typ = Mime.Type(m.name);
        if (!typ) {
            trans.status = STATUS.FILE_NOT_FOUND;
            trans.submit();
            return;
        }
        if (m.type == null)
            m.type = ImageSupport.IMAGE;
        let pat = this.supports[m.type];
        // 判断上传的类型是否正确
        if (!pat || pat.indexOf(typ) == -1) {
            trans.status = STATUS.TYPE_MISMATCH;
            trans.submit();
            return;
        }
        let info = new FileInfo();
        info.name = m.name;
        info.storedir = srv.store;
        info.input = srv.store + "/" + m.name;
        if (!fs.existsSync(info.input)) {
            trans.status = STATUS.FILE_NOT_FOUND;
            trans.submit();
            return;
        }
        this.filter(info, m.filter, ret => {
            trans.output(typ, RespFile.Regular(ret.output));
        });
    }

    // 处理滤镜
    filter(info: FileInfo, filter: string, cb: (info: FileInfo) => void) {
        if (!filter) {
            info.output = info.input;
            cb(info);
            return;
        }
        // 解析filter
        let f = new Filter();
        if (!f.parse(filter)) {
            info.output = info.input;
            cb(info);
            return;
        }
        let h = f.hash;
        // 判断有没有之前生成好的
        let pi = ph.parse(info.input);
        // 目标文件路径
        info.workdir = pi.dir + "/" + pi.name;
        info.output = info.workdir + "/" + h + pi.ext;
        fs.access(info.output, fs.constants.R_OK, err => {
            // 如果有生成好的，则直接使用
            if (!err) {
                cb(info);
                return;
            }
            // 生成图片
            // 确保工作文件夹存在
            if (!fs.existsSync(info.workdir))
                fs.mkdirSync(info.workdir);
            // 生成图片
            f.process(info, err => {
                if (err) {
                    info.output = info.input;
                    cb(info);
                    logger.warn("滤镜处理失败 {{=it.path}} {{=it.filter}} {{=it.error}}", {
                        path: info.input,
                        filter: filter,
                        error: err
                    });
                }
                else {
                    cb(info);
                }
            });
        });
    }

    @action(QrCodeGenerate, [], "生成二维码")
    async qrcode(trans: Transaction) {
        let m: QrCodeGenerate = trans.model;
        let stm = await QrCode.Generate(m.content);
        trans.output(Mime.Type("png"), stm);
    }
}

interface ImageStoreNode extends Node {
    // 存储图片的位置
    store: string;
}

export class ImageStore extends Rest {

    constructor() {
        super();
        this.routers.register(new RImageStore());
    }

    @pathd()
    store: string;

    config(cfg: Node): boolean {
        if (!super.config(cfg))
            return false;
        let c = <ImageStoreNode>cfg;
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
