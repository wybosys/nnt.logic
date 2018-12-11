import {Rest} from "../../server/rest";
import {Node} from "../../config/config";
import {static_cast} from "../../core/core";
import {logger} from "../../core/logger";
import {RAdmin} from "./radmin";

interface AdminConfig {
    host: string;
    user: string;
    password: string;
}

export class Admin extends Rest {

    constructor() {
        super();
        this.routers.register(new RAdmin());
    }

    host: string;
    port: number;
    user: string;
    password: string;

    config(cfg: Node): boolean {
        if (!super.config(cfg))
            return false;
        let c = static_cast<AdminConfig>(cfg);
        if (!c.host)
            return false;
        let arr = c.host.split(":");
        this.host = arr[0];
        this.port = arr.length == 2 ? parseInt(arr[1]) : 15672;
        this.user = c.user;
        this.password = c.password;
        return true;
    }

    async start(): Promise<void> {
        this.onStart();
        logger.info("连接 {{=it.id}}@rmqadmin", {id: this.id});
    }

    async stop(): Promise<void> {
        this.onStop();
    }
}
