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
