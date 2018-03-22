// 预定义0输入输出的对象
import {array, auth, enumerate, enumm, input, integer, json, model, optional, output, string} from "./proto";
import {ArrayT, ICopyable, StringT} from "./kernel";
import {colboolean, colinteger, coljson, colstring, coltype, table} from "../store/proto";
import {DateTime} from "./time";

// 空模型
@model()
export class Null {
}

// 需要登陆的空模型
@model([auth])
export class AuthedNull {
}

// Rest服务下ClientSDK的心跳更新
@model()
export class RestUpdate {

    @integer(1, [output], "心跳间隔")
    heartbeatTime: number;

    @json(2, [output])
    models: Object;
}

// MID: message id，类似jid的概念为，user@domain/resource/ 的格式定义了消息的方向信息
export type mid_t = string;

export interface MidInfo {
    user: string;
    domain: string;
    resources?: string[];
}

export function mid_clone(info: MidInfo): MidInfo {
    return {
        user: info.user,
        domain: info.domain,
        resources: ArrayT.Clone(info.resources)
    }
}

export function mid_parse(mid: mid_t): MidInfo {
    if (!mid)
        return null;
    let p = mid.split("/");
    let p0 = p[0].split("@");
    if (p0.length != 2)
        return null;
    return {
        user: p0[0],
        domain: StringT.Lowercase(p0[1]),
        resources: ArrayT.RangeOf(p, 1)
    };
}

export function mid_str(user: string, domain: string, ...res: string[]): string {
    let r = user + "@" + domain;
    if (res.length)
        r += "/" + res.join("/");
    return r;
}

export function mid_strv(user: string, domain: string, res: string[]): string {
    let r = user + "@" + domain;
    if (res.length)
        r += "/" + res.join("/");
    return r;
}

export function mid_unparse(info: MidInfo): mid_t {
    let r = info.user + "@" + info.domain;
    if (info.resources && info.resources.length)
        r += "/" + info.resources.join("/");
    return r;
}

export function mid_make(user: string, domain: string, ...res: string[]): MidInfo {
    return {
        user: user,
        domain: domain,
        resources: res
    };
}

export function mid_makev(user: string, domain: string, res: string[]): MidInfo {
    return {
        user: user,
        domain: domain,
        resources: res
    };
}

export function mid_equal(l: MidInfo, r: MidInfo): boolean {
    if (!ArrayT.EqualTo(l.resources, r.resources))
        return false;
    return l.user == r.user && l.domain == r.domain;
}

export let IM_DBID = "im";
export let IM_TBID = "chatmsgs";

// 通用消息模型（服务如imchat)
@model([auth])
@table(IM_DBID, IM_TBID)
export class Message implements ICopyable<Message> {

    @json(1, [input, output, optional], "发送者mid对象")
    @coljson()
    fromi: MidInfo; // 接收时直接反序列化，提高性能

    @coljson()
    toi: MidInfo;

    @integer(2, [input, output, optional], "消息类型，留给业务层定义，代表payload的具体数据结构")
    @colinteger()
    type: number;

    @json(3, [input, output, optional], "消息体")
    @coltype(Object)
    payload: Object;

    @integer(4, [output], "时间戳")
    @colinteger()
    timestamp: number = DateTime.Now();

    @colboolean()
    online: boolean; // 只发送在线的

    copy(r: Message): boolean {
        this.fromi = mid_clone(r.fromi);
        this.toi = mid_clone(r.toi);
        this.payload = r.payload;
        this.timestamp = r.timestamp;
        this.online = r.online;
        return true;
    }
}

@model([auth])
export class Messages {
    toi: MidInfo;

    @array(1, Message, [output], "消息列表")
    items: Array<Message>;
}

// 返回的数据格式
@model([enumm])
export class ProviderContentType {

    // 原始格式
    static RAW = 0;

    // 按照纯js格式返回，可以直接用在script元素中
    static JAVASCRIPT = 1;

    // 返回字符串形式，方便客户端eval操作
    static STRING = 2;
}

// 配合sdk的客户端组件提供模式
@model()
export class ProviderContent {

    @enumerate(1, ProviderContentType, [input], "输出类型")
    type: number;

    @string(2, [input], "请求返回的脚本id")
    id: string;
}

// 容器使用的基础模型
@model()
export class TemplateModel {

    @string(1, [input])
    @colstring()
    tid: string;

    @string(2, [input])
    @colstring()
    iid: string;
}

// 容器使用的基础通知模型
@model()
export class TemplatePayload {

    @string(1, [input, output], "自定义的通知标记")
    @colstring()
    channel: string;
}

// 处理分页的模型
@model()
export class Paged {

    @integer(1, [input, output, optional], "排序依赖的最大数值")
    last: number = -1;

    @integer(2, [input, optional], "一次拉取多少个")
    limit: number = 10;

    @array(3, Object, [output], "接收到的对象")
    items: any[];

    @array(4, Object, [output], "所有对象")
    all: any[];
}

// 充值下单
@model()
export class PayOrder {

    @string(1, [output], "订单号")
    @colstring()
    orderid: string;

    @colinteger()
    time: number; // 下单时间

    @colinteger()
    @string(2, [output], "价格")
    price: number; // 价格

    @colstring()
    @string(3, [output], "说明文字")
    desc: string; // 说明文字

    @colstring()
    @string(4, [output], "部分渠道需要配置商品id")
    prodid: string;

    @colstring()
    type: string;

    @colboolean()
    close: boolean; // 关闭交易
}

// 定义内部的错误码
// <0的代表系统级错误，>0代表成功，但是需要额外处理，=0代表完全成功
@model([enumm])
export class STATUS {
    static UNKNOWN = -1000;
    static EXCEPTION = -999; // 遇到了未处理的异常
    static ROUTER_NOT_FOUND = -998; // 没有找到路由
    static CONTEXT_LOST = -997; // 上下文丢失
    static MODEL_ERROR = -996; // 恢复模型失败
    static PARAMETER_NOT_MATCH = -995; // 参数不符合要求
    static NEED_AUTH = -994; // 需要登陆
    static TYPE_MISMATCH = -993; // 参数类型错误
    static FILESYSTEM_FAILED = -992; // 文件系统失败
    static FILE_NOT_FOUND = -991; // 文件不存在
    static ARCHITECT_DISMATCH = -990; // 代码不符合标准架构
    static SERVER_NOT_FOUND = -989; // 没有找到服务器
    static LENGTH_OVERFLOW = -988; // 长度超过限制
    static TARGET_NOT_FOUND = -987; // 目标对象没有找到
    static PERMISSIO_FAILED = -986; // 没有权限
    static WAIT_IMPLEMENTION = -985; // 等待实现
    static ACTION_NOT_FOUND = -984; // 没有找到动作
    static TARGET_EXISTS = -983; // 已经存在
    static STATE_FAILED = -982; // 状态错误
    static UPLOAD_FAILED = -981; // 上传失败
    static MASK_WORD = -980; // 有敏感词
    static SELF_ACTION = -979; // 针对自己进行操作
    static PASS_FAILED = -978; // 验证码匹配失败
    static OVERFLOW = -977; // 数据溢出
    static AUTH_EXPIRED = -976; // 授权过期
    static SIGNATURE_ERROR = -975; // 签名错误

    static IM_CHECK_FAILED = -899; // IM检查输入的参数失败
    static IM_NO_RELEATION = -898; // IM检查双方不存在关系

    static THIRD_FAILED = -5; // 第三方出错
    static MULTIDEVICE = -4; // 多端登陆
    static HFDENY = -3; // 高频调用被拒绝（之前的访问还没有结束) high frequency deny
    static TIMEOUT = -2; // 超时
    static FAILED = -1; // 一般失败
    static OK = 0; // 成功
    static DELAY_RESPOND = 10000; // 延迟响应
    static REST_NEED_RELISTEN = 10001; // rest访问需要重新启动监听
}
