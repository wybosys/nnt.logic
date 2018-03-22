import {AbstractServer} from "./server";
import {IMQClient, IMQServer} from "./mq";
import {Node} from "../config/config";

class Alionsmq extends AbstractServer implements IMQServer {

    config(cfg: Node): boolean {
        if (!super.config(cfg))
            return false;
        return true;
    }

    async start(): Promise<void> {

    }

    async stop(): Promise<void> {

    }

    instanceClient(): IMQClient {
        return null;
    }
}