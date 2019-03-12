import {Rest} from "./rest";
import {pathd} from "../core/url";
import {Node} from "../config/config";
import fs = require("fs");
import {RImageStore} from "./rimagestore";
import {RAudioStore} from "./raudiostore";
import {RFileStore} from "./rfilestore";

interface MediaStoreNode extends Node {
    // 存储位置
    store: string;

    // 不安全模式(可以定义保存路径)
    unsafe: boolean;

    // 是否开启图片存储，默认为开
    image?: boolean;

    // 是否开启语音存储，默认为关
    audio?: boolean;

    // 是否开启文件存储，默认为关
    file?: boolean;
}

export class MediaStore extends Rest {

    constructor() {
        super();
    }

    @pathd()
    store: string;
    unsafe: boolean;
    image: boolean;
    audio: boolean;
    file: boolean;

    config(cfg: Node): boolean {
        if (!super.config(cfg))
            return false;
        let c = <MediaStoreNode>cfg;
        if (!c.store)
            return false;
        this.store = c.store;
        this.unsafe = c.unsafe;
        this.image = c.image == null || c.image;
        this.audio = !!c.audio;
        this.file = !!c.file;
        return true;
    }

    async start(): Promise<void> {
        await super.start();
        if (!fs.existsSync(this.store))
            fs.mkdirSync(this.store);
        if (this.image) {
            this.routers.register(new RImageStore());
        }
        if (this.audio) {
            this.routers.register(new RAudioStore());
        }
        if (this.file) {
            this.routers.register(new RFileStore());
        }
    }
}
