import {FieldOption, GetFieldInfos, GetStoreInfo, IsStoreModel} from "../../../nnt/store/proto";
import {AbstractRdb, FpToRelvDefType} from "../../../nnt/store/rdb";
import {AbstractKv} from "../../../nnt/store/kv";
import {Require} from "../../../nnt/core/core";
import {expand} from "../../../nnt/core/url";
import {Find} from "../../../nnt/manager/dbmss";

export interface DbCfg {
    model: string[];
    out: string[];
}

export function GenDb(cfg: DbCfg) {
    let models = [];
    cfg.model.forEach(e => {
        let path = expand(e);
        Require(path, clz => {
            if (!IsStoreModel(clz))
                return;
            let info = GetStoreInfo(clz);
            let cnn = Find(info.id);
            if (cnn instanceof AbstractRdb) {
                // 更新关系数据库
                this.updateRdb(clz, cnn, () => {
                });
            }
            else if (cnn instanceof AbstractKv) {
                // 更新kv数据库
                this.updateKv(clz, cnn, () => {
                });
            }
        });
    });
}

function UpdateRdb(clz: any, cnn: AbstractRdb, cb: () => void) {
    let info = GetStoreInfo(clz);
    let fields = GetFieldInfos(clz.prototype);
    // 数据库是否存在
    cnn.query(["select count(*) from ??", info.table], res => {
        if (res == null) {
            // 创建数据库
            let ps = [];
            let cmd = "create table ?? (";
            ps.push(info.table);
            // columns
            let segs = [];
            for (let fk in fields) {
                let info: FieldOption = fields[fk];
                let seg = " ?? " + FpToRelvDefType(info);
                ps.push(fk);
                // fields参数
                if (!info.notnull)
                    seg += " not null";
                if (info.zero)
                    seg += " zerofill";
                if (info.unsign)
                    seg += " unsigned";
                if (info.autoinc)
                    seg += " auto_increment";
                segs.push(seg);
                // 其他参数
                if (info.key) {
                    segs.push(" primary key (??)");
                    ps.push(fk);
                }
                if (info.unique) {
                    segs.push(" unique index ?? (?? " + info.desc ? "desc" : "asc" + ")");
                    ps.push(fk + "_UNIQUE");
                    ps.push(fk);
                }
            }
            // 合并
            cmd += segs.join(",") + ")";
            // 请求创建数据表
            cnn.query([cmd, ps], res => {
                cb();
            });
        }
        else {
            // 先拉出现有表的结构
            cnn.query(["show columns from " + info.table, null], res => {
                let segs = new Array();
                let pss = new Array();
                res.forEach((e: any) => {
                    let name = e["Field"];
                    // 如果当前的对象中不存在，则生成删除的子句
                    if (!(name in fields)) {
                        segs.push("alter table ?? drop column ??");
                        pss.push([info.table, name]);
                    }
                    else {
                        let fp: FieldOption = fields[name];
                        // 是否需要升级字段
                        if (cnn.compareFieldDef(fp, e) == false) {
                            let seg = "";
                            // fields参数
                            if (fp.notnull)
                                seg += " not null";
                            if (fp.zero)
                                seg += " zerofill";
                            if (fp.unsign)
                                seg += " unsigned";
                            if (fp.autoinc)
                                seg += " auto_increment";
                            segs.push("alter table ?? modify column ?? " + FpToRelvDefType(fp) + seg);
                            pss.push([info.table, name]);
                        }
                    }
                });
                // 是否有新加的字段
                for (let fk in fields) {
                    let fnd = res.some((e: any) => {
                        return e["Field"] == fk;
                    });
                    if (fnd)
                        continue;
                    let fp: FieldOption = fields[fk];
                    // 找到了新字段
                    let seg = "";
                    // fields参数
                    if (fp.notnull)
                        seg += " not null";
                    if (fp.zero)
                        seg += " zerofill";
                    if (fp.unsign)
                        seg += " unsigned";
                    if (fp.autoinc)
                        seg += " auto_increment";
                    segs.push("alter table ?? add column ?? " + FpToRelvDefType(fp) + seg);
                    pss.push([info.table, fk]);
                }
                // 应用
                if (segs.length) {
                    let cmd = segs.join(";");
                    let ps = new Array();
                    pss.forEach(e => {
                        ps = ps.concat(e);
                    });
                    cnn.query([cmd, ps], res => {
                        cb();
                    });
                }
                else {
                    cb();
                }
            });
        }
    });
}

function UpdateKv(clz: any, cnn: AbstractKv, cb: () => void) {
    let info = GetStoreInfo(clz);
    let fields = GetFieldInfos(clz.prototype);
    cb();
}
