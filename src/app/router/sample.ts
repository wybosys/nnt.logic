import {action, IRouter} from "../../nnt/core/router";
import {DateTime} from "../../nnt/core/time";
import {TODAY_RANGE} from "../../nnt/component/today";
import {Echoo, Login, LoginSDK, LoginVerifySDK, Message, Upload, User} from "../model/sample";
import {Trans} from "../model/trans";
import {Get, Set} from "../../nnt/manager/dbmss";
import {Fetch} from "../../nnt/server/remote";
import {logger} from "../../nnt/core/logger";
import {Null} from "../../nnt/core/models";
import {SampleEcho} from "../model/framework-nntlogic-apis";
import {Rest} from "../../nnt/session/rest";
import {Sdks, SdkUserLogin, SdkUserVerify} from "../../nnt/thirds/sdks/sdks";
import {Find} from "../../nnt/manager/servers";
import {Manager} from "../manager/manager";
import {UUID} from "../../nnt/core/random";

export class RSample implements IRouter {
    action = "sample";

    constructor() {
        Manager.shared().signals.emit('hello');
    }

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

    @action(Echoo)
    async callecho(trans: Trans) {
        let mdl: Echoo = trans.model;
        let m = SampleEcho();
        m.input = mdl.input;
        await Rest.Get(m);
        mdl.output = m.output;
        trans.submit();
    }

    @action(Login)
    async login(trans: Trans) {
        let m: Login = trans.model;
        trans.sid = m.sid = await RSample.Login(m.uid);
        trans.responseSessionId = true;
        trans.submit();
    }

    static async Login(uid: string): Promise<string> {
        // 测试登陆，查询，如果数据库中没有，则生成新得
        let fnd = await Get(Login, {uid: uid});
        let sid: string;
        if (fnd) {
            sid = fnd.sid;
        } else {
            sid = UUID();
            Set(Login, {uid: uid}, {sid: sid});
            Set(Login, {sid: sid}, {uid: uid});
        }
        return sid;
    }

    @action(LoginSDK)
    async loginsdk(trans: Trans) {
        let m: LoginSDK = trans.model;
        let sdk: Sdks = <Sdks>Find("sdk");
        let ml = new SdkUserLogin();
        ml.channel = m.channel;
        ml.raw = m.raw;
        try {
            let ret = await sdk.userLogin(ml);
            let user = new User();
            user.uid = ret.user.userid;
            m.user = user;
            m.sid = ret.sid;
        } catch (err) {
            trans.status = err.code;
        }
        trans.submit();
    }

    @action(LoginVerifySDK)
    async loginverifysdk(trans: Trans) {
        let m: LoginVerifySDK = trans.model;
        let sdk: Sdks = <Sdks>Find("sdk");
        let ml = new SdkUserVerify();
        ml.sid = m.sid;
        try {
            let ret = await sdk.userVerify(ml);
            let user = new User();
            user.uid = ret.userid;
            m.user = user;
        } catch (err) {
            trans.status = err.code;
        }
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
        } catch (err) {
            trans.status = err.code;
            logger.warn(err.message);
        }
        trans.submit();
    }

    @action(Null, [], "不需要传参的模型")
    async null(trans: Trans) {
        trans.submit();
    }
}
