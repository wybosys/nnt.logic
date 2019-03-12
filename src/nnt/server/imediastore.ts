export interface IMediaStore {

    // 存储目录
    store: string;

    // 非安全模式
    // 支持定义上传、下载的目录
    // 直接使用wget先下载后验证
    unsafe: boolean;
}
