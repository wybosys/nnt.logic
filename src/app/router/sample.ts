import {action, IRouter} from "../../nnt/core/router";
import {DateTime} from "../../nnt/core/time";
import {TODAY_RANGE} from "../../nnt/component/today";
import {Echoo, Login, Message, Upload, User} from "../model/sample";
import {UUID} from "../../nnt/core/core";
import {Trans} from "../model/trans";
import {Get, Set} from "../../nnt/manager/dbmss";
import {Fetch} from "../../nnt/server/remote";
import {logger} from "../../nnt/core/logger";

export class RSample implements IRouter {
    action = "sample";

    @action(Echoo)
    echo(trans: Trans) {
        let m: Echoo = trans.model;
        m.output = m.input;
        m.time = DateTime.Now();
        m.json = {
            today: TODAY_RANGE
        };
        m.map.set('a0', 0).set('b1', 1);
        m.array.push(0, 1, 2, 3);
        trans.submit();
    }

    @action(Login)
    async login(trans: Trans) {
        let m: Login = trans.model;
        // 测试登陆，查询，如果数据库中没有，则生成新得
        let fnd = await Get(Login, {uid: m.uid});
        if (fnd) {
            trans.sid = fnd.sid;
        } else {
            trans.sid = UUID();
            Set(Login, {uid: m.uid}, {sid: trans.sid});
            Set(Login, {sid: trans.sid}, {uid: m.uid});
        }
        m.sid = trans.sid;
        trans.responseSessionId = true;
        trans.submit();
    }

    @action(User)
    async user(trans: Trans) {
        let m: User = trans.model;
        m.uid = trans.uid;
        trans.submit();
    }

    @action(Message, [], "监听消息炸弹")
    message(trans: Trans) {
        trans.submit();
    }

    @action(Upload, [], "上传图片")
    async upload(trans: Trans) {
        let m: Upload = trans.model;
        try {
            let res = await Fetch('media', {
                action: 'imagestore.upload',
                file: m.file
            });
            m.file = res.path;
        }
        catch (err) {
            logger.warn(err.message);
        }
        trans.submit();
    }
}
