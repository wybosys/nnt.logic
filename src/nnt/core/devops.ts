import fs = require("fs-extra");
import {expand} from "./url";
import {StringT} from "./kernel";

interface DevopsConfig {
    path: string;
    client: boolean;
    domain: string;
}

let devopsConfig: DevopsConfig;
const CONFIG_FILE = expand('~/devops.json');
if (fs.existsSync(CONFIG_FILE)) {
    devopsConfig = <any>fs.readJsonSync(CONFIG_FILE);
    devopsConfig.domain = StringT.SubStr(devopsConfig.path, 16);
    if (devopsConfig.domain.endsWith('/'))
        devopsConfig.domain = StringT.SubStr(devopsConfig.domain, 0, devopsConfig.domain.length - 1);
}

export function GetPath(): string {
    return devopsConfig.path;
}

export function GetDomain(): string {
    return devopsConfig.domain;
}
