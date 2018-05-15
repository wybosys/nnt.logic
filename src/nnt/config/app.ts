import {Node} from "./config"
import {IndexedObject} from "../core/kernel";

export interface AppNodes {

    // 全局配置节点
    config?: IndexedObject;

    // 服务器节点
    server?: Node[];

    // 数据库节点
    dbms?: Node[];

    // 日志节点
    logger?: Node[];

    // 容器节点
    container?: Node[];
}

export interface DevopsNodes {

    client?: boolean; // 是否允许客户端访问本服务
    server?: boolean; // 是否允许服务端访问本服务
}