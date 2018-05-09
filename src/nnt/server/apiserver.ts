export interface IApiServer {

    // 用来给api提供图床，设置的是对应服务的srvid
    imgsrv: string;

    // 用来给api提供视频、音频池
    mediasrv: string;
}

export interface IHttpServer {

    // 返回内部实现的http原始句柄 http.Server
    httpserver(): any;
}