export declare enum STATUS {
    MULTIDEVICE = -4,
    HFDENY = -3,
    TIMEOUT = -2,
    FAILED = -1,
    OK = 0,
    DELAY_RESPOND = 10000,
    REST_NEED_RELISTEN = 10001
}
export declare class StatusError extends Error {
    constructor(code: STATUS, msg?: string);
    code: STATUS;
}
