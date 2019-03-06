import {Rest} from "./rest";
import {RImageStore} from "./imagestore";
import {RAudioStore} from "./audiostore";
import {pathd} from "../core/url";
import {Node} from "../config/config";
import fs = require("fs");

interface MediaStoreNode extends Node {
    // 存储位置
    store: string;

    // 不安全模式(可以定义保存路径)
    unsafe: boolean;
}

export class MediaStore extends Rest {

    constructor() {
        super();
        this.routers.register(new RImageStore());
        this.routers.register(new RAudioStore());
    }

    @pathd()
    store: string;
    unsafe: boolean;

    config(cfg: Node): boolean {
        if (!super.config(cfg))
            return false;
        let c = <MediaStoreNode>cfg;
        if (!c.store)
            return false;
        this.store = c.store;
        this.unsafe = c.unsafe;
        return true;
    }

    async start(): Promise<void> {
        await super.start();
        if (!fs.existsSync(this.store))
            fs.mkdirSync(this.store);
    }
}
