import {Node} from "../config/config"
import {AbstractRdb, RdbCmdType} from "./rdb";
import {logger} from "../core/logger";
import {FieldOption, FpIsTypeEqual} from "./proto";
import mysql = require("mysql");

interface MySqlNode extends Node {
    // 地址或者sock
    host: string;

    // 用户、密码
    user: string;
    pwd: string;

    // 数据库
    scheme: string;
}

let DEFAULT_PORT = 3306;

export class RMySql extends AbstractRdb {

    // 主机名
    host: string;
    port: number = DEFAULT_PORT;

    // 使用sock文件来连接
    sock: string;

    // 用户名、密码
    user: string;
    pwd: string;
    scheme: string;

    config(cfg: Node): boolean {
        super.config(cfg);
        let c = <MySqlNode>cfg;
        this.user = c.user;
        this.pwd = c.pwd;
        this.scheme = c.scheme;
        this.host = this.sock = null;
        if (c.host.indexOf("unix://") == 0) {
            this.sock = c.host;
        }
        else {
            let p = c.host.split(":");
            if (p.length == 1) {
                this.host = c.host;
                this.port = DEFAULT_PORT;
            }
            else {
                this.host = p[0];
                this.port = parseInt(p[1]);
            }
        }
        return true;
    }

    protected _hdl: mysql.Pool;

    async open(): Promise<void> {
        if (this._hdl)
            this.close();
        let cnf: any = {
            "user": this.user,
            "password": this.pwd,
            "database": this.scheme
        };
        if (this.host) {
            cnf["host"] = this.host;
            cnf["port"] = this.port;
        }
        else if (this.sock) {
            cnf["socketPath"] = this.sock;
        }
        cnf["multipleStatements"] = true;
        try {
            this._hdl = mysql.createPool(cnf);
        }
        catch (err) {
            logger.fatal("启动失败 mysql@{{=it.id}}", {id: this.id});
        }
        finally {
            logger.info("启动 mysql@{{=it.id}}", {id: this.id});
        }
    }

    async close(): Promise<void> {
        if (!this._hdl)
            return;
        this._hdl.end();
        this._hdl = null;
    }

    query(cmd: RdbCmdType, cb: (res: any) => void) {
        this._hdl.query(cmd[0], cmd[1], (err, res, flds) => {
            if (err) {
                logger.exception(err);
                cb(null);
                return;
            }
            cb(res);
        });
    }

    static ConvertFpFromMysql(typ: string): FieldOption {
        let r: FieldOption = {};
        if (typ == "tinyint(1)")
            r.boolean = true;
        if (typ.indexOf("int") != -1)
            r.integer = true;
        if (typ.indexOf("char") != -1)
            r.string = true;
        else if (typ == "text")
            r.string = true;
        return r;
    }

    /*
    {
  "Field": "id",
  "Type": "int(11)",
  "Null": "NO",
  "Key": "PRI",
  "Default": null,
  "Extra": "auto_increment"
}
     */
    compareFieldDef(my: FieldOption, tgt: any): boolean {
        if (!FpIsTypeEqual(RMySql.ConvertFpFromMysql(tgt["Type"]), my))
            return false;
        if (!my.key)
            if ((tgt["Null"] == "NO") != my.notnull)
                return false;
        if ((tgt["Key"] == "PRI") != my.key)
            return false;
        if ((tgt["Extra"].indexOf("auto_increment") != -1) != my.autoinc)
            return false;
        return true;
    }
}
