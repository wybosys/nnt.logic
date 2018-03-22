import {DbCfg} from "./gendb";
import {expand} from "../../../nnt/core/url";
import {Require} from "../../../nnt/core/core";
import {coldef, GetFieldInfos, GetStoreInfo, IsStoreModel} from "../../../nnt/store/proto";
import {logger} from "../../../nnt/core/logger";
import xlsx = require("xlsx");

export function GenDbXls(cfg: DbCfg) {
    if (!cfg.out || !cfg.model) {
        logger.warn("没有找到可用的数据库对象");
        return;
    }

    let rows = new Array<Array<any>>();
    cfg.model.forEach(e => {
        let path = expand(e);
        Require(path, clz => {
            if (!IsStoreModel(clz))
                return;
            // 把clz对应的数据结构生成到jsobj中
            let store = GetStoreInfo(clz);

            // 生成头的描述
            rows.push([store.table, store.id]);

            // 生成数据段
            let tmp = new clz();
            let fields = GetFieldInfos(tmp);
            for (let field in fields) {
                let fp = fields[field];
                rows.push([
                    field,
                    coldef(fp)
                ]);
            }

            // 生成空行
            rows.push([]);
        });
    });

    let wb = xlsx.utils.book_new();
    let st = xlsx.utils.aoa_to_sheet(rows);
    xlsx.utils.book_append_sheet(wb, st, "tables");
    cfg.out.forEach(e => {
        xlsx.writeFile(wb, expand(e));
    });
}