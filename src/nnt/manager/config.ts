export module Config {

    // DEBUG模式
    export let DEBUG: boolean = false;

    // DEVELOP模式，和debug的区别，develop用来部署开发服务器，debug用来做本地开发，会影响到app.json中对服务器的启动处理
    export let DEVELOP: boolean = false;

    // PUBLISH模式，和release类似，除了会使用线上配置外，其他又和develop一致
    export let PUBLISH: boolean = false;

    // 正式版模式
    export let DISTRIBUTION: boolean = true;

    // sid过期时间，此框架中时间最小单位为秒
    export let SID_EXPIRE: number = 86400;

    // clientid 过期时间
    export let CID_EXPIRE: number = 600;

    // model含有最大fields的个数
    export let MODEL_FIELDS_MAX: number = 100;

    // transaction超时时间
    export let TRANSACTION_TIMEOUT: number = 20;

    // 默认的https证书配置
    export let HTTPS: boolean;
    export let HTTP2: boolean;
    export let HTTPS_KEY: string;
    export let HTTPS_CERT: string;
    export let HTTPS_PFX: string;
    export let HTTPS_PASSWD: string;

    // 用于DES的密钥，只能在开服时修改，不然修改前产生的数据都会解密失败
    export let DES_KEY: string = "0i923,dfau9o8";

    // 服务端缓存目录
    export let CACHE = "cache";

    // 最大下载文件的大小
    export let FILESIZE_LIMIT = 10485760; // 10M

    // 打开nodejs内建的集群
    export let CLUSTER = false;

    // nodejs内建集群的数量
    export let CLUSTER_PARALLEL = 0;

    // 强制以master启动
    export let FORCE_MASTER: boolean;
    export let FORCE_SLAVER: boolean;
}

// 判断是否是开发版
export function IsDebug(): boolean {
    return Config.DEBUG || Config.DEVELOP || Config.PUBLISH;
}

// 是否是正式版
export function IsRelease(): boolean {
    return Config.DISTRIBUTION;
}

export function DebugValue<T>(d: T, r: T): T {
    return Config.DISTRIBUTION ? r : d;
}

// 支持DEVOPS的架构判断
export function IsDevops(): boolean {
    return 'DEVOPS' in process.env && !('DEVOPS_RELEASE' in process.env);
}

export function IsDevopsRelease(): boolean {
    return 'DEVOPS_RELEASE' in process.env;
}

export function IsLocal(): boolean {
    return !('DEVOPS' in process.env) && !('DEVOPS_RELEASE' in process.env);
}