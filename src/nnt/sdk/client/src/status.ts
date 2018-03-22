export enum STATUS {
    MULTIDEVICE = -4, // 多端登陆
    HFDENY = -3, // 高频调用被拒绝（之前的访问还没有结束) high frequency deny
    TIMEOUT = -2, // 超时
    FAILED = -1, // 一般失败
    OK = 0, // 成功
    DELAY_RESPOND = 10000, // 延迟响应
    REST_NEED_RELISTEN = 10001, // rest访问需要重新启动监听
}

export class StatusError extends Error {

    constructor(code: STATUS, msg?: string) {
        super(msg);
        this.code = code;
    }

    code: STATUS;
}