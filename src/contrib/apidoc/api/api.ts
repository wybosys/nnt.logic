import {Model} from "./model-impl";

export module models {


    export enum ProviderContentType {
    
        RAW = 0,
    
        JAVASCRIPT = 1,
    
        STRING = 2,
    
    }

    export enum STATUS {
    
        UNKNOWN = -1000,
    
        EXCEPTION = -999,
    
        ROUTER_NOT_FOUND = -998,
    
        CONTEXT_LOST = -997,
    
        MODEL_ERROR = -996,
    
        PARAMETER_NOT_MATCH = -995,
    
        NEED_AUTH = -994,
    
        TYPE_MISMATCH = -993,
    
        FILESYSTEM_FAILED = -992,
    
        FILE_NOT_FOUND = -991,
    
        ARCHITECT_DISMATCH = -990,
    
        SERVER_NOT_FOUND = -989,
    
        LENGTH_OVERFLOW = -988,
    
        TARGET_NOT_FOUND = -987,
    
        PERMISSIO_FAILED = -986,
    
        WAIT_IMPLEMENTION = -985,
    
        ACTION_NOT_FOUND = -984,
    
        TARGET_EXISTS = -983,
    
        STATE_FAILED = -982,
    
        UPLOAD_FAILED = -981,
    
        MASK_WORD = -980,
    
        SELF_ACTION = -979,
    
        PASS_FAILED = -978,
    
        OVERFLOW = -977,
    
        AUTH_EXPIRED = -976,
    
        SIGNATURE_ERROR = -975,
    
        IM_CHECK_FAILED = -899,
    
        IM_NO_RELEATION = -898,
    
        THIRD_FAILED = -5,
    
        MULTIDEVICE = -4,
    
        HFDENY = -3,
    
        TIMEOUT = -2,
    
        FAILED = -1,
    
        OK = 0,
    
        DELAY_RESPOND = 10000,
    
        REST_NEED_RELISTEN = 10001,
    
    }

    export enum Code {
    
        LOGIN_FAILED = -100,
    
        USER_EXISTS = -101,
    
        LOGIN_EXPIRED = -102,
    
        ANNOYMOUS_DENY = -103,
    
        USER_NOT_FOUND = -104,
    
        VERIFY_FAILED = -105,
    
        ROOMID_FAILED = -106,
    
        FRIEND_WAIT = -107,
    
        REQUIREMENT_FAILED = -108,
    
        ROOM_FULLED = -109,
    
        ROOM_EXPIRED = -110,
    
        ROOM_USER_EXISTS = -111,
    
        GANG_FULLED = -112,
    
        NEED_ITEMS = -113,
    
        FRIEND_APPLY = -114,
    
        FRIEND_DONE = -115,
    
        CANNOT_CHANGED = -116,
    
        PICKED = -117,
    
        REQUIRED_LOST = -118,
    
        USER_OFFLINE = -119,
    
        USER_INTEAM = -120,
    
        ANSWER_WRONG = -121,
    
        CANNOT_BE_SELF = -122,
    
        GANG_ALREADY_RECOMMAND = -123,
    
        NO_USING_PET = -124,
    
        ROOM_JOINING = -125,
    
        PHONE_BINDED = -126,
    
        MUST_FRIEND = -127,
    
    }

    export enum NoticeType {
    
        SYSTEM = 1,
    
    }

    export enum ImMsgType {
    
        CHAT = 0,
    
        DELTA = 1,
    
        GAME = 2,
    
        MAIL = 3,
    
        NOTICE = 4,
    
        INTERNAL = 9,
    
    }

    export enum ImMsgSubType {
    
        CHAT = 0,
    
        OFFLINE = 1,
    
        ONLINE = 2,
    
        QUICK_CHAT = 3,
    
        PAY_DONE = 4,
    
        GROUP_JOINED = 16,
    
        GROUP_EXIT = 17,
    
        GROUP_DISMISS = 18,
    
        GROUP_CREATED = 19,
    
        FRIEND_APPLY = 32,
    
        FRIEND_AGREE = 33,
    
        FRIEND_EXIT = 34,
    
        TEAM_APPLY = 48,
    
        TEAM_AGREE = 49,
    
        TEAM_DISAGREE = 50,
    
        TEAM_EXIT = 51,
    
        DATING_APPLY = 64,
    
        DATING_DONE = 65,
    
        DATING_FAILED = 66,
    
        DATING_DISAGREE = 67,
    
        DATING_EXIT = 68,
    
        DATING_INCOMPLETE = 69,
    
        DATING_AGREE = 70,
    
        DATING_TASKCHANGED = 71,
    
        DATING_TASKEND = 72,
    
        ROOM_JOINED = 80,
    
        ROOM_EXIT = 81,
    
        ROOM_INVITED = 82,
    
        ROOM_READY = 83,
    
        ROOM_LEAVE = 84,
    
        ROOM_COMEBACK = 85,
    
        ROOM_MODIFIED = 86,
    
        GAME_START = 96,
    
        GAME_COMPLETE = 97,
    
        BANG_GRABED = 240,
    
        GOT_GIFT = 241,
    
        SAVE_GIFT = 243,
    
        OPENURL = 244,
    
        ACHIEVE_COMPLETE = 245,
    
    }

    export enum GiftStatus {
    
        WAITING = 0,
    
        SAVED = 1,
    
    }

    export enum MailType {
    
        RANK_REWARDS = 16,
    
    }

    export enum PostType {
    
        PAINT = 0,
    
        PHOTO = 1,
    
    }

    export enum PostSource {
    
        ALL = 0,
    
        FRIENDS = 1,
    
        SELF = 2,
    
    }

    export enum FriendStatus {
    
        NORMAL = 0,
    
        WAITING = 1,
    
        APPLYING = 2,
    
    }

    export enum TaskRecord {
    
        CHAT = 1,
    
        DATING_QUESTION = 32,
    
        DRAWQUE_COMPLETE = 48,
    
        DRAWQUE_COMPLETE_TEAM = 49,
    
    }



    export const DRAWQUE_CHANNEL = "drawque";

    export const DRAWQUE_WORD_CHANGED = "word_changed";

    export const DRAWQUE_ELEMENTS_CHANGED = "elements_changed";

    export const DRAWQUE_ROUND_ENDED = "round_ended";

    export const DRAWQUE_ROUND_STARTED = "round_started";

    export const DRAWQUE_ROUND_DIANPING = "round_dianping";

    export const DRAWQUE_GAME_END = "game_end";

    export const DRAWQUE_DRAWING = "elements_drawing";

    export const DRAWQUE_ANSWER_RIGHT = "answer_right";

    export const DRAWQUE_PET_CHANGED = "pet_changed";

    export const DRAWQUE_CALL_PET = "pet_called";

    export const DRAWQUE_STATUS_CANCHANGEWORD = "word_canchange";

    export const DRAWQUE_STATUS_IDLECHECK = "drawing_wait";

    export const DRAWQUE_WAIT_ROUNDEND = 3;



    export class Null extends Model {
    
    }

    export class AuthedNull extends Model {
    
    }

    export class RestUpdate extends Model {
    
        @Model.integer(1, [Model.output], "心跳间隔")
        heartbeatTime:number;
    
        @Model.json(2, [Model.output])
        models:Object;
    
    }

    export class Message extends Model {
    
        @Model.json(1, [Model.input, Model.output, Model.optional], "发送者mid对象")
        fromi?:Object;
    
        @Model.integer(2, [Model.input, Model.output, Model.optional], "消息类型，留给业务层定义，代表payload的具体数据结构")
        type?:number;
    
        @Model.json(3, [Model.input, Model.output, Model.optional], "消息体")
        payload?:Object;
    
        @Model.integer(4, [Model.output], "时间戳")
        timestamp:number;
    
    }

    export class Messages extends Model {
    
        @Model.array(1, Message, [Model.output], "消息列表")
        items:Array<Message>;
    
    }

    export class ProviderContent extends Model {
    
        @Model.enumerate(1, ProviderContentType, [Model.input], "输出类型")
        type:ProviderContentType;
    
        @Model.string(2, [Model.input], "请求返回的脚本id")
        id:string;
    
    }

    export class TemplateModel extends Model {
    
        @Model.string(1, [Model.input])
        tid:string;
    
        @Model.string(2, [Model.input])
        iid:string;
    
    }

    export class TemplatePayload extends Model {
    
        @Model.string(1, [Model.input, Model.output], "自定义的通知标记")
        channel:string;
    
    }

    export class Paged extends Model {
    
        @Model.integer(1, [Model.input, Model.output, Model.optional], "排序依赖的最大数值")
        last?:number;
    
        @Model.integer(2, [Model.input, Model.optional], "一次拉取多少个")
        limit?:number;
    
        @Model.array(3, Object, [Model.output], "接收到的对象")
        items:Array<Object>;
    
        @Model.array(4, Object, [Model.output], "所有对象")
        all:Array<Object>;
    
    }

    export class PayOrder extends Model {
    
        @Model.string(1, [Model.output], "订单号")
        orderid:string;
    
        @Model.string(2, [Model.output], "价格")
        price:string;
    
        @Model.string(3, [Model.output], "说明文字")
        desc:string;
    
        @Model.string(4, [Model.output], "部分渠道需要配置商品id")
        prodid:string;
    
    }

    export class Banner extends Model {
    
        @Model.string(1, [Model.output], "文字")
        content:string;
    
        @Model.string(2, [Model.output], "图片地址，不包含host的部分")
        image:string;
    
        @Model.string(3, [Model.output], "链接")
        link:string;
    
    }

    export class GameBriefInfo extends Model {
    
        @Model.string(1, [Model.input, Model.output], "模板id")
        tid:string;
    
        @Model.string(2, [Model.input, Model.output], "实例id")
        iid:string;
    
        @Model.file(3, [Model.input, Model.output], "游戏图标")
        icon:any;
    
        @Model.string(4, [Model.input, Model.output], "游戏名称")
        name:string;
    
        @Model.boolean(5, [Model.output], "是否支持购买房间")
        buyroom:boolean;
    
    }

    export class RoomBriefInfo extends Model {
    
        @Model.string(1, [Model.input, Model.output], "模板id")
        tid:string;
    
        @Model.string(2, [Model.input, Model.output], "实例id")
        iid:string;
    
        @Model.string(3, [Model.input, Model.output], "房间id")
        rid:string;
    
    }

    export class UserVipInfo extends Model {
    
        @Model.integer(1, [Model.output], "vip的类型，对应vip的配表id")
        type:number;
    
        @Model.integer(2, [Model.output])
        expire:number;
    
    }

    export class UserBriefInfo extends Model {
    
        @Model.string(1, [Model.output], "平台号")
        pid:string;
    
        @Model.string(2, [Model.output], "昵称")
        nickname:string;
    
        @Model.file(3, [Model.output], "头像")
        avatar:string;
    
        @Model.integer(6, [Model.output], "性别")
        gender:number;
    
        @Model.integer(7, [Model.output], "年龄")
        age:number;
    
        @Model.string(8, [Model.output], "省市区")
        place:string;
    
        @Model.string(9, [Model.output], "职业")
        job:string;
    
        @Model.string(10, [Model.output], "个性签名")
        endnote:string;
    
        @Model.string(11, [Model.output], "独家专访")
        interview:string;
    
        @Model.string(12, [Model.output], "兴趣爱好")
        interest:string;
    
        @Model.boolean(13, [Model.output], "和我是不是好友")
        isfriend:boolean;
    
        @Model.integer(14, [Model.output], "vip的配置(同VIP表的ID,>0有效，否则不是vip")
        vip:number;
    
        @Model.string(15, [Model.output], "星座")
        xingzuo:string;
    
        @Model.boolean(16, [Model.output], "是否在线")
        online:boolean;
    
        @Model.type(17, GameBriefInfo, [Model.output], "正在玩的游戏")
        playing:GameBriefInfo;
    
        @Model.map(18, Model.integer_t, Model.integer_t, [Model.output], "拥有得道具数据，Item表里获得得都在这里面")
        items:Map<number, number>;
    
        @Model.integer(19, [Model.output], "性别偏好")
        genderfavor:number;
    
        @Model.string(20, [Model.output], "和谁正在组队")
        teamplayer:string;
    
        @Model.type(21, RoomBriefInfo, [Model.output], "正在参与的房间信息")
        room:RoomBriefInfo;
    
    }

    export class Item extends Model {
    
        @Model.integer(1, [Model.input, Model.output], "配表索引")
        index:number;
    
        @Model.integer(2, [Model.input, Model.output], "数量")
        count:number;
    
    }

    export class Delta extends Model {
    
        @Model.map(1, Model.integer_t, Model.integer_t, [Model.output], "物品信息")
        items:Map<number, number>;
    
        @Model.boolean(2, [Model.output], "是否应用VIP加成")
        vipAddition:boolean;
    
    }

    export class NoticeMsg extends Model {
    
        @Model.string(1, [Model.input, Model.output], "模板内容")
        template:string;
    
        @Model.type(2, Object, [Model.input, Model.output, Model.optional], "填充字段")
        params?:Object;
    
        @Model.integer(3, [Model.input, Model.output, Model.optional], "播放次数, -1代表无限循环")
        loop?:number;
    
        @Model.integer(4, [Model.input, Model.output, Model.optional], "模板id")
        templateid?:number;
    
        @Model.enumerate(5, NoticeType, [Model.input, Model.output], "消息类型")
        type:NoticeType;
    
        @Model.integer(6, [Model.input, Model.optional], "过期时间, 单位为s, 不填则永远不过期")
        lifetime?:number;
    
    }

    export class ImMsg extends Model {
    
        @Model.string(1, [Model.output], "文本消息")
        plain:string;
    
        @Model.file(2, [Model.output], "图片消息")
        image:string;
    
        @Model.file(3, [Model.output], "语音消息")
        audio:string;
    
        @Model.type(4, Delta, [Model.output], "该消息附带道具变动（真正道具变动的消息会走ImMsgType大通知，所以此处的变更不要更新背包）")
        delta:Delta;
    
    }

    export class ImChatMsg extends ImMsg {
    
        @Model.enumerate(1, ImMsgSubType, [Model.output], "子类型")
        subtype:ImMsgSubType;
    
        @Model.boolean(2, [Model.output], "可用状态")
        valid:boolean;
    
        @Model.integer(3, [Model.output], "带出来的配置索引")
        index:number;
    
    }

    export class ImMailMsg extends ImMsg {
    
        @Model.string(1, [Model.output], "邮件的id")
        mid:string;
    
        @Model.enumerate(2, MailType, [Model.output], "邮件的类型")
        type:MailType;
    
    }

    export class ImSendChat extends Model {
    
        @Model.string(1, [Model.input], "对方的mid")
        to:string;
    
        @Model.enumerate(2, ImMsgType, [Model.input], "主消息类型")
        type:ImMsgType;
    
        @Model.enumerate(3, ImMsgSubType, [Model.input], "子消息类型")
        subtype:ImMsgSubType;
    
        @Model.string(4, [Model.input, Model.optional], "文本消息")
        plain?:string;
    
        @Model.file(5, [Model.input, Model.optional], "图片消息")
        image?:any;
    
        @Model.file(6, [Model.input, Model.optional], "语音消息")
        audio?:any;
    
        @Model.type(7, Message, [Model.output], "发送出去的消息")
        message:Message;
    
    }

    export class QueryUserVipInfo extends Model {
    
        @Model.array(2, UserVipInfo, [Model.output])
        items:Array<UserVipInfo>;
    
    }

    export class UserInfo extends UserBriefInfo {
    
        @Model.string(1, [Model.output], "实名")
        realname:string;
    
        @Model.boolean(2, [Model.output], "有没有修改过性别")
        genderchanged:boolean;
    
        @Model.boolean(3, [Model.output], "有没有修改过昵称")
        nicknamechanged:boolean;
    
        @Model.string(4, [Model.output], "如果是第三方登陆，则返回UID")
        uid:string;
    
    }

    export class UserPushId extends Model {
    
        @Model.string(1, [Model.input])
        pushid:string;
    
    }

    export class ModifyUserInfo extends Model {
    
        @Model.string(2, [Model.input, Model.output, Model.optional], "昵称")
        nickname?:string;
    
        @Model.file(3, [Model.input, Model.output, Model.optional], "头像")
        avatar?:any;
    
        @Model.integer(6, [Model.input, Model.output, Model.optional], "性别")
        gender?:number;
    
        @Model.integer(7, [Model.input, Model.output, Model.optional], "年龄")
        age?:number;
    
        @Model.string(8, [Model.input, Model.output, Model.optional], "省市区")
        place?:string;
    
        @Model.string(9, [Model.input, Model.output, Model.optional], "职业")
        job?:string;
    
        @Model.string(10, [Model.input, Model.output, Model.optional], "个性签名")
        endnote?:string;
    
        @Model.string(11, [Model.input, Model.output, Model.optional], "独家专访")
        interview?:string;
    
        @Model.string(12, [Model.input, Model.output, Model.optional], "兴趣爱好")
        interest?:string;
    
        @Model.string(15, [Model.input, Model.output, Model.optional], "星座")
        xingzuo?:string;
    
        @Model.integer(19, [Model.input, Model.output, Model.optional], "性别偏好")
        genderfavor?:number;
    
        @Model.type(30, Delta, [Model.output])
        delta:Delta;
    
        @Model.type(31, UserInfo, [Model.output])
        info:UserInfo;
    
        @Model.string(32, [Model.input, Model.optional], "用相册中的图片作为头像")
        avatarurl?:string;
    
    }

    export class LoginInfo extends Model {
    
        @Model.string(1, [Model.input, Model.optional], "登陆账号，不输则为使用sid登陆")
        account?:string;
    
        @Model.string(2, [Model.input, Model.optional], "密码")
        password?:string;
    
        @Model.type(3, UserInfo, [Model.output], "用户信息")
        info:UserInfo;
    
        @Model.string(4, [Model.output])
        sid:string;
    
        @Model.string(5, [Model.input, Model.optional], "第三方登陆的id")
        uid?:string;
    
        @Model.string(6, [Model.output], "绑定的电话")
        phone:string;
    
        @Model.integer(7, [Model.output], "服务器的时间")
        time:number;
    
        @Model.string(8, [Model.input, Model.optional], "邀请人")
        inviterpid?:string;
    
    }

    export class RegisterInfo extends LoginInfo {
    
        @Model.string(1, [Model.input], "账号")
        account:string;
    
        @Model.string(2, [Model.input], "密码")
        password:string;
    
        @Model.string(3, [Model.input], "昵称")
        nickname:string;
    
        @Model.string(4, [Model.input], "获得图形码时拿到的key")
        key:string;
    
        @Model.string(5, [Model.input], "通过短信获得的密码")
        pass:string;
    
    }

    export class ModifyPassword extends Model {
    
        @Model.string(1, [Model.input], "手机号")
        phone:string;
    
        @Model.string(2, [Model.input], "密码")
        password:string;
    
        @Model.string(3, [Model.input], "获得图形码时拿到的key")
        key:string;
    
        @Model.string(4, [Model.input], "通过短信获得的密码")
        pass:string;
    
    }

    export class BindPhone extends Model {
    
        @Model.string(1, [Model.input], "手机号")
        phone:string;
    
        @Model.string(2, [Model.input], "密码")
        password:string;
    
        @Model.string(3, [Model.input], "获得图形码时拿到的key")
        key:string;
    
        @Model.string(4, [Model.input], "通过短信获得的密码")
        pass:string;
    
    }

    export class GenCode extends Model {
    
        @Model.string(1, [Model.output], "需要随接口传出去的验证字串")
        key:string;
    
        @Model.string(2, [Model.output], "图片的base64数据")
        image:string;
    
    }

    export class ApplyCode extends Model {
    
        @Model.string(1, [Model.input], "电话号码")
        phone:string;
    
        @Model.string(2, [Model.input], "GenCode时获得的key")
        key:string;
    
        @Model.string(3, [Model.input], "用户输入的图形验证码")
        pass:string;
    
    }

    export class QueryUser extends Model {
    
        @Model.string(1, [Model.input], "平台号")
        pid:string;
    
        @Model.type(2, UserBriefInfo, [Model.output], "用户信息")
        info:UserBriefInfo;
    
    }

    export class GiftInfo extends Model {
    
        @Model.string(1, [Model.input], "送给谁")
        to:string;
    
        @Model.type(2, Delta, [Model.output])
        delta:Delta;
    
        @Model.string(3, [Model.output])
        id:string;
    
    }

    export class SendFlower extends GiftInfo {
    
        @Model.integer(1, [Model.input], "多少个")
        count:number;
    
    }

    export class Mail extends Model {
    
        @Model.string(1, [Model.input, Model.output], "邮件ID")
        mid:string;
    
        @Model.type(2, Delta, [Model.output], "邮件带的物品")
        delta:Delta;
    
    }

    export class Mails extends Model {
    
        @Model.array(1, Mail, [Model.output])
        items:Array<Mail>;
    
    }

    export class Redpoint extends Model {
    
        @Model.integer(1, [Model.output], "等待接受的约会数量")
        datingapplys:number;
    
        @Model.integer(2, [Model.output], "正在进行的约会数量")
        datings:number;
    
    }

    export class UserPicture extends Model {
    
        @Model.file(1, [Model.input, Model.output], "照片文件")
        image:any;
    
        @Model.integer(2, [Model.output], "上传时间")
        time:number;
    
    }

    export class PictureInfo extends Model {
    
        @Model.string(1, [Model.input], "照片路径")
        image:string;
    
    }

    export class UserPictures extends Model {
    
        @Model.string(1, [Model.input, Model.optional], "好友id,不传就是取自己的")
        pid?:string;
    
        @Model.array(2, UserPicture, [Model.output], "所有照片")
        items:Array<UserPicture>;
    
    }

    export class UserTili extends Model {
    
        @Model.integer(1, [Model.output], "上次恢复的时间")
        time:number;
    
    }

    export class UserShare extends Model {
    
        @Model.integer(1, [Model.input], "share表的id")
        index:number;
    
        @Model.string(1, [Model.input, Model.output, Model.optional])
        title?:string;
    
        @Model.string(2, [Model.input, Model.output, Model.optional])
        desc?:string;
    
        @Model.string(3, [Model.input, Model.output, Model.optional])
        link?:string;
    
        @Model.string(4, [Model.input, Model.output, Model.optional])
        image?:string;
    
    }

    export class PostCount extends Model {
    
        @Model.integer(1, [Model.output], "次数")
        comments:number;
    
        @Model.integer(2, [Model.output])
        views:number;
    
        @Model.integer(3, [Model.output])
        shares:number;
    
    }

    export class PostInfo extends Model {
    
        @Model.string(1, [Model.output], "收藏者")
        owner:string;
    
        @Model.string(2, [Model.output], "创作者")
        creater:string;
    
        @Model.string(3, [Model.input, Model.output, Model.optional])
        title?:string;
    
        @Model.string(4, [Model.input, Model.output, Model.optional])
        content?:string;
    
        @Model.file(5, [Model.input, Model.output, Model.optional])
        image?:any;
    
        @Model.type(6, PostCount, [Model.output])
        count:PostCount;
    
        @Model.string(7, [Model.output], "post的id")
        id:string;
    
        @Model.enumerate(8, PostType, [Model.output], "类型")
        type:PostType;
    
        @Model.integer(9, [Model.output], "发布的时间")
        time:number;
    
    }

    export class Posts extends Paged {
    
        @Model.enumerate(1, PostSource, [Model.input, Model.optional])
        source?:PostSource;
    
        @Model.array(3, PostInfo, [Model.output], "接收到的对象")
        items:Array<PostInfo>;
    
        @Model.array(4, PostInfo, [Model.output], "所有对象")
        all:Array<PostInfo>;
    
    }

    export class PostComment extends Model {
    
        @Model.string(1, [Model.output])
        from:string;
    
        @Model.string(2, [Model.input, Model.output, Model.optional])
        to?:string;
    
        @Model.string(3, [Model.input, Model.output])
        content:string;
    
        @Model.integer(4, [Model.output])
        time:number;
    
    }

    export class PostMakeComment extends PostComment {
    
        @Model.string(1, [Model.input], "post的id")
        id:string;
    
    }

    export class PostComments extends Model {
    
        @Model.string(1, [Model.input], "post的id")
        id:string;
    
        @Model.integer(2, [Model.input, Model.optional], "只拉去前面的几条信息，不传则是拉取全部的")
        limit?:number;
    
        @Model.array(3, PostComment, [Model.output])
        items:Array<PostComment>;
    
        @Model.integer(4, [Model.output], "评论总数")
        count:number;
    
    }

    export class PostView extends Model {
    
        @Model.string(1, [Model.input], "post的id")
        id:string;
    
        @Model.type(2, PostCount, [Model.output])
        count:PostCount;
    
    }

    export class PostShare extends Model {
    
        @Model.string(1, [Model.input], "post的id")
        id:string;
    
        @Model.type(2, PostCount, [Model.output])
        count:PostCount;
    
    }

    export class AddFriend extends Model {
    
        @Model.string(1, [Model.input], "平台id")
        pid:string;
    
        @Model.type(2, Delta, [Model.output], "加好友会消耗一朵鲜花")
        delta:Delta;
    
    }

    export class RemoveFriend extends Model {
    
        @Model.string(1, [Model.input], "平台id")
        pid:string;
    
    }

    export class Friends extends Model {
    
        @Model.string(1, [Model.input, Model.optional], "平台id，如果不传则查询的是自己的好友")
        pid?:string;
    
        @Model.array(2, Model.string_t, [Model.output], "好友列表")
        friends:Array<string>;
    
        @Model.enumerate(3, FriendStatus, [Model.input], "好友的状态")
        status:FriendStatus;
    
        @Model.boolean(4, [Model.input, Model.optional], "只列出最近添加的")
        recent?:boolean;
    
    }

    export class GroupInfo extends Model {
    
        @Model.string(1, [Model.output], "群主")
        admin:string;
    
        @Model.string(2, [Model.input, Model.output, Model.optional], "群名称")
        name?:string;
    
        @Model.string(3, [Model.input, Model.output, Model.optional], "群公告")
        annon?:string;
    
        @Model.array(4, Model.string_t, [Model.output], "成员，包含群主")
        members:Array<string>;
    
        @Model.string(5, [Model.output], "群id")
        gid:string;
    
    }

    export class ModifyGroup extends GroupInfo {
    
        @Model.string(5, [Model.input, Model.output], "群id")
        gid:string;
    
    }

    export class CreateGroup extends Model {
    
        @Model.array(1, Model.string_t, [Model.input], "成员pid列表，不需要传自己的")
        pids:Array<string>;
    
        @Model.type(2, GroupInfo, [Model.output], "群信息")
        info:GroupInfo;
    
        @Model.type(3, Delta, [Model.output])
        delta:Delta;
    
    }

    export class ExitGroup extends Model {
    
        @Model.string(1, [Model.input], "群id")
        gid:string;
    
        @Model.array(2, Model.string_t, [Model.input], "退出群的pid列表；如果传的是自己，则自己退出群；如果自己是群主，则是删除群；")
        pids:Array<string>;
    
        @Model.type(3, GroupInfo, [Model.output], "之后的群信息，=null群被删除，否则只是踢人")
        info:GroupInfo;
    
    }

    export class QueryGroups extends Model {
    
        @Model.array(1, GroupInfo, [Model.output], "群列表")
        items:Array<GroupInfo>;
    
        @Model.string(2, [Model.input, Model.optional], "群id")
        gid?:string;
    
    }

    export class GroupInvite extends Model {
    
        @Model.string(1, [Model.input], "群id")
        gid:string;
    
        @Model.array(2, Model.string_t, [Model.input], "好友id列表")
        pids:Array<string>;
    
        @Model.type(3, GroupInfo, [Model.output], "群信息")
        info:GroupInfo;
    
    }

    export class TeamInvite extends Model {
    
        @Model.string(1, [Model.input], "邀请谁")
        to:string;
    
    }

    export class DatingApply extends Model {
    
        @Model.string(1, [Model.output], "源")
        from:string;
    
        @Model.string(2, [Model.input, Model.output], "目标")
        to:string;
    
        @Model.type(3, Delta, [Model.output], "本人的消耗")
        delta:Delta;
    
        @Model.integer(4, [Model.output], "时间")
        time:number;
    
        @Model.integer(5, [Model.input, Model.output], "约会动作的类型 date表id")
        dateindex:number;
    
        @Model.string(6, [Model.output], "纪录id")
        id:string;
    
    }

    export class DatingAgree extends Model {
    
        @Model.string(1, [Model.input], "约会的纪录id，apply.id")
        id:string;
    
    }

    export class DatingDisagree extends Model {
    
        @Model.string(1, [Model.input], "约会的纪录id，apply.id")
        id:string;
    
    }

    export class DatingExit extends Model {
    
        @Model.string(1, [Model.input], "约会的纪录id，apply.id")
        id:string;
    
    }

    export class DatingAnswer extends Model {
    
        @Model.string(1, [Model.input], "约会的纪录id，apply.id")
        id:string;
    
        @Model.string(2, [Model.input], "答案")
        answer:string;
    
    }

    export class DatingProgress extends Model {
    
        @Model.string(1, [Model.input], "约会的纪录id，apply.id")
        id:string;
    
        @Model.integer(2, [Model.output], "datetype中的id")
        type:number;
    
        @Model.integer(3, [Model.output], "如果是答题，则返回题目的id")
        quest:number;
    
        @Model.boolean(4, [Model.output], "是否已经完成")
        done:boolean;
    
    }

    export class DatingUsers extends Model {
    
        @Model.array(1, DatingApply, [Model.output], "等待别人同意的")
        applys:Array<DatingApply>;
    
        @Model.array(2, DatingApply, [Model.output], "别人等待我同意的")
        waitings:Array<DatingApply>;
    
    }

    export class DatingRewards extends Model {
    
        @Model.string(1, [Model.input], "约会的id")
        id:string;
    
        @Model.type(2, Delta, [Model.output], "领取的奖励")
        delta:Delta;
    
    }

    export class DatingRewardsInfo extends Model {
    
        @Model.string(1, [Model.input], "约会的id")
        id:string;
    
        @Model.type(2, Delta, [Model.output], "可以领取的奖励")
        delta:Delta;
    
    }

    export class DatingRecommend extends Model {
    
        @Model.boolean(1, [Model.input, Model.optional], "是否强刷，强刷会扣道具")
        flush?:boolean;
    
        @Model.array(2, Model.string_t, [Model.output], "推荐的人")
        members:Array<string>;
    
        @Model.type(3, Delta, [Model.output])
        delta:Delta;
    
    }

    export class GangUserCost extends Model {
    
        @Model.string(1, [Model.input], "目标用户")
        pid:string;
    
        @Model.type(2, Delta, [Model.output], "我自己的消耗")
        cost:Delta;
    
        @Model.type(3, Delta, [Model.output], "对方的增量")
        target:Delta;
    
    }

    export class GangDayIncome extends Model {
    
        @Model.integer(1, [Model.output], "收入金币")
        gold:number;
    
        @Model.integer(2, [Model.output], "收入钻石")
        diamond:number;
    
        @Model.boolean(3, [Model.output], "领取状态")
        got:boolean;
    
        @Model.integer(4, [Model.output], "宝宝玩游戏贡献得金币，总金币得自己加起来")
        gamegold:number;
    
    }

    export class GangMemberProduce extends Model {
    
        @Model.string(1, [Model.input])
        pid:string;
    
        @Model.integer(2, [Model.input, Model.optional])
        gold?:number;
    
        @Model.integer(3, [Model.input, Model.optional])
        diamond?:number;
    
        @Model.integer(4, [Model.input, Model.optional])
        gamegold?:number;
    
    }

    export class GangMemberDayProduce extends Model {
    
        @Model.string(1, [Model.output])
        pid:string;
    
        @Model.integer(2, [Model.output], "当天金币产出")
        gold:number;
    
        @Model.integer(3, [Model.output], "当天钻石产出")
        diamond:number;
    
        @Model.integer(4, [Model.output], "当天玩游戏的金币产出")
        gamegold:number;
    
    }

    export class GangInfo extends Model {
    
        @Model.string(1, [Model.input, Model.optional], "不传则是看自己的")
        pid?:string;
    
        @Model.integer(2, [Model.output], "本周收入")
        week:number;
    
        @Model.integer(3, [Model.output], "今天收入")
        today:number;
    
        @Model.integer(4, [Model.output], "昨日收入")
        yesterday:number;
    
        @Model.type(5, Item, [Model.output], "当前的道具总量")
        now:Item;
    
        @Model.array(6, GangDayIncome, [Model.output], "一周的收益，改日没有则为null，数组长度保证为7")
        incomes:Array<GangDayIncome>;
    
    }

    export class GangGetReward extends Model {
    
        @Model.type(1, Delta, [Model.output], "增量")
        delta:Delta;
    
    }

    export class GangRevenger extends Model {
    
        @Model.string(1, [Model.output], "仇人id")
        pid:string;
    
        @Model.string(2, [Model.output], "抢的是谁")
        who:string;
    
    }

    export class GangRevengers extends Model {
    
        @Model.array(1, GangRevenger, [Model.output], "仇人们")
        items:Array<GangRevenger>;
    
    }

    export class GangRecommend extends Model {
    
        @Model.string(1, [Model.input, Model.output], "宝宝id")
        pid:string;
    
        @Model.integer(2, [Model.output], "每小时产出金币")
        gold:number;
    
        @Model.integer(3, [Model.output], "每小时产出钻石")
        diamond:number;
    
        @Model.integer(4, [Model.output], "每小时产出金币")
        golds:number;
    
    }

    export class GangRecommends extends Model {
    
        @Model.array(1, GangRecommend, [Model.output], "宝宝们")
        pids:Array<GangRecommend>;
    
        @Model.array(2, GangRecommend, [Model.output], "超级宝宝，为空就是当前没有超级宝宝可以推荐")
        supers:Array<GangRecommend>;
    
        @Model.boolean(3, [Model.input, Model.optional], "强制刷新列表，会扣道具")
        flush?:boolean;
    
        @Model.type(4, Delta, [Model.output])
        delta:Delta;
    
    }

    export class GangMembers extends Model {
    
        @Model.string(1, [Model.input, Model.optional], "不传就是看自己的")
        pid?:string;
    
        @Model.array(2, GangMemberDayProduce, [Model.output], "宝宝列表")
        items:Array<GangMemberDayProduce>;
    
        @Model.integer(3, [Model.output], "当前好友的上限")
        userslimit:number;
    
    }

    export class GangGrabMember extends Model {
    
        @Model.string(1, [Model.input], "宝宝")
        pid:string;
    
        @Model.type(3, Delta, [Model.output], "数据更新")
        delta:Delta;
    
    }

    export class GangRevengerIgnore extends Model {
    
        @Model.string(1, [Model.input], "仇人")
        rpid:string;
    
        @Model.string(2, [Model.input], "宝宝")
        mpid:string;
    
    }

    export class GangOfferMember extends Model {
    
        @Model.boolean(1, [Model.input, Model.output, Model.optional], "是否是超级宝宝")
        super?:boolean;
    
        @Model.integer(2, [Model.input, Model.optional], "档次")
        type?:number;
    
        @Model.type(3, Delta, [Model.output])
        delta:Delta;
    
    }

    export class HomeInfo extends Model {
    
        @Model.array(1, Banner, [Model.output], "轮播广告")
        carousels:Array<Banner>;
    
        @Model.array(2, Banner, [Model.output], "入口列表")
        items:Array<Banner>;
    
    }

    export class RoomType extends Model {
    
        @Model.integer(1, [Model.output], "类型id")
        id:number;
    
        @Model.integer(2, [Model.output], "房间时长")
        duration:number;
    
        @Model.type(3, Item, [Model.output], "需要的物品")
        cost:Item;
    
    }

    export class RoomTypes extends Model {
    
        @Model.array(1, RoomType, [Model.output], "类型列表")
        types:Array<RoomType>;
    
        @Model.string(2, [Model.input], "游戏tid")
        tid:string;
    
    }

    export class RoomInfo extends Model {
    
        @Model.string(1, [Model.input, Model.output], "游戏的模板id")
        tid:string;
    
        @Model.string(2, [Model.input, Model.output], "游戏的实例id")
        iid:string;
    
        @Model.string(4, [Model.output], "房间号")
        rid:string;
    
        @Model.integer(5, [Model.output], "过期时间")
        expire:number;
    
        @Model.integer(6, [Model.output], "房间人数, -1代表不限制")
        memberlimit:number;
    
        @Model.type(7, Item, [Model.output], "押注的物品")
        bet:Item;
    
        @Model.boolean(8, [Model.input, Model.output, Model.optional], "允许陌生人进入")
        annony?:boolean;
    
        @Model.string(10, [Model.input, Model.output, Model.optional], "房间口令")
        password?:string;
    
        @Model.boolean(11, [Model.output], "房间是否加密")
        encrypt:boolean;
    
        @Model.string(12, [Model.input, Model.output, Model.optional], "房间公告")
        announ?:string;
    
        @Model.boolean(13, [Model.input, Model.output, Model.optional], "房间踢人")
        kickit?:boolean;
    
        @Model.string(14, [Model.output], "实例名称")
        insname:string;
    
        @Model.string(15, [Model.output], "快速加入房间的代码")
        joincode:string;
    
        @Model.string(16, [Model.output], "房主")
        owner:string;
    
        @Model.string(17, [Model.output], "游戏图标")
        icon:string;
    
        @Model.type(20, Object, [Model.input, Model.output, Model.optional], "游戏的额外设置")
        gamesetting?:Object;
    
        @Model.integer(21, [Model.output], "房间的配置id")
        type:number;
    
        @Model.integer(22, [Model.output], "房间内当前人数信息")
        memberscount:number;
    
        @Model.string(23, [Model.output], "正在玩的游戏局id")
        gid:string;
    
    }

    export class CreateRoomInfo extends RoomInfo {
    
        @Model.integer(1, [Model.input, Model.output], "房间的配置id")
        type:number;
    
        @Model.type(2, Delta, [Model.output])
        delta:Delta;
    
    }

    export class RenewRoom extends Model {
    
        @Model.string(1, [Model.input], "游戏模板id")
        tid:string;
    
        @Model.string(2, [Model.input], "实例id")
        iid:string;
    
        @Model.string(3, [Model.input], "房间id")
        rid:string;
    
        @Model.integer(4, [Model.input], "房间的配置id")
        type:number;
    
        @Model.type(5, RoomInfo, [Model.output], "续期后的过期时间")
        info:RoomInfo;
    
        @Model.type(6, Delta, [Model.output])
        delta:Delta;
    
    }

    export class QueryRooms extends Model {
    
        @Model.string(1, [Model.input, Model.optional])
        tid?:string;
    
        @Model.string(2, [Model.input, Model.optional])
        iid?:string;
    
        @Model.string(3, [Model.input, Model.optional])
        rid?:string;
    
        @Model.array(4, RoomInfo, [Model.output], "房间列表")
        items:Array<RoomInfo>;
    
        @Model.string(5, [Model.input, Model.optional], "加入房间使用的code")
        joincode?:string;
    
    }

    export class AvailableRooms extends Model {
    
        @Model.string(1, [Model.input])
        tid:string;
    
        @Model.string(2, [Model.input])
        iid:string;
    
        @Model.array(3, Model.string_t, [Model.output], "房间列表")
        items:Array<string>;
    
        @Model.boolean(4, [Model.input, Model.optional], "强制刷新一次")
        recalc?:boolean;
    
    }

    export class RecentlyRooms extends Model {
    
        @Model.string(1, [Model.input, Model.optional], "用户pid, 不传是查自己")
        pid?:string;
    
        @Model.array(2, Model.string_t, [Model.output], "房间列表")
        items:Array<string>;
    
    }

    export class ModifyRoomInfo extends RoomInfo {
    
        @Model.string(1, [Model.input, Model.output], "房间号")
        rid:string;
    
        @Model.type(2, Delta, [Model.output], "改变房间类型时，道具的满足情况")
        delta:Delta;
    
    }

    export class UserReady extends Model {
    
        @Model.string(1, [Model.input])
        tid:string;
    
        @Model.string(2, [Model.input])
        iid:string;
    
        @Model.string(3, [Model.input])
        rid:string;
    
        @Model.boolean(4, [Model.input])
        ready:boolean;
    
    }

    export class RoomUser extends Model {
    
        @Model.string(1, [Model.input], "游戏模板id")
        tid:string;
    
        @Model.string(2, [Model.input], "实例id")
        iid:string;
    
        @Model.string(3, [Model.input], "房间id")
        rid:string;
    
        @Model.string(4, [Model.output], "玩家id")
        pid:string;
    
        @Model.boolean(5, [Model.output], "是否已经准备")
        ready:boolean;
    
        @Model.boolean(6, [Model.output], "是否离开房间")
        leave:boolean;
    
        @Model.string(7, [Model.output], "谁邀请的")
        inviter:string;
    
    }

    export class RoomWatcher extends Model {
    
        @Model.string(1, [Model.input], "游戏模板id")
        tid:string;
    
        @Model.string(2, [Model.input], "实例id")
        iid:string;
    
        @Model.string(3, [Model.input], "房间id")
        rid:string;
    
    }

    export class UsersInRoom extends Model {
    
        @Model.string(1, [Model.input], "游戏模板id")
        tid:string;
    
        @Model.string(2, [Model.input], "实例id")
        iid:string;
    
        @Model.string(3, [Model.input], "房间id")
        rid:string;
    
        @Model.array(4, RoomUser, [Model.output], "房间内的用户列表")
        users:Array<RoomUser>;
    
    }

    export class RoomJoin extends Model {
    
        @Model.string(1, [Model.input, Model.output, Model.optional], "游戏模板id")
        tid?:string;
    
        @Model.string(2, [Model.input, Model.optional], "实例id")
        iid?:string;
    
        @Model.string(3, [Model.input, Model.optional], "房间id")
        rid?:string;
    
        @Model.string(4, [Model.input, Model.optional], "加入房间使用的code")
        joincode?:string;
    
        @Model.string(5, [Model.input, Model.optional], "房间口令")
        password?:string;
    
        @Model.type(6, Delta, [Model.output], "加入房间需要的押金")
        delta:Delta;
    
    }

    export class RoomExit extends Model {
    
        @Model.string(1, [Model.input], "游戏模板id")
        tid:string;
    
        @Model.string(2, [Model.input], "实例id")
        iid:string;
    
        @Model.string(3, [Model.input], "房间id")
        rid:string;
    
    }

    export class RoomLeave extends Model {
    
        @Model.string(1, [Model.input], "游戏模板id")
        tid:string;
    
        @Model.string(2, [Model.input], "实例id")
        iid:string;
    
        @Model.string(3, [Model.input], "房间id")
        rid:string;
    
    }

    export class RoomInvite extends Model {
    
        @Model.string(1, [Model.input], "游戏模板id")
        tid:string;
    
        @Model.string(2, [Model.input], "实例id")
        iid:string;
    
        @Model.string(3, [Model.input], "房间id")
        rid:string;
    
        @Model.string(4, [Model.input], "好友的pid")
        friend:string;
    
    }

    export class RoomAgree extends Model {
    
        @Model.string(1, [Model.input], "游戏模板id")
        tid:string;
    
        @Model.string(2, [Model.input], "实例id")
        iid:string;
    
        @Model.string(3, [Model.input], "房间id")
        rid:string;
    
        @Model.type(4, Delta, [Model.output], "加入房间需要的押金")
        delta:Delta;
    
    }

    export class FastRoom extends Model {
    
        @Model.string(1, [Model.input])
        tid:string;
    
        @Model.string(2, [Model.input])
        iid:string;
    
        @Model.string(3, [Model.output])
        rid:string;
    
    }

    export class RechargeRecord extends PayOrder {
    
        @Model.integer(1, [Model.input], "recharge中的配表ID")
        index:number;
    
    }

    export class BuyVipRecord extends PayOrder {
    
        @Model.integer(1, [Model.input], "vip的配表ID")
        index:number;
    
    }

    export class BuyItem extends Model {
    
        @Model.integer(1, [Model.input], "配表ID")
        index:number;
    
        @Model.integer(2, [Model.input, Model.optional], "购买的数量，默认为 1")
        count?:number;
    
        @Model.type(4, Delta, [Model.output])
        delta:Delta;
    
    }

    export class ExchangeItem extends Model {
    
        @Model.integer(1, [Model.input], "目标")
        index:number;
    
        @Model.integer(2, [Model.input, Model.optional], "数量，默认为1")
        count?:number;
    
        @Model.type(3, Delta, [Model.output])
        delta:Delta;
    
    }

    export class TestOrder extends Model {
    
        @Model.string(1, [Model.input])
        orderid:string;
    
    }

    export class Regions extends Model {
    
        @Model.array(1, Model.string_t, [Model.output], "国家地区")
        names:Array<string>;
    
    }

    export class Provinces extends Model {
    
        @Model.string(1, [Model.input], "地区")
        region:string;
    
        @Model.array(2, Model.string_t, [Model.output], "名称")
        names:Array<string>;
    
    }

    export class Citys extends Model {
    
        @Model.string(1, [Model.input], "地区")
        region:string;
    
        @Model.string(2, [Model.input], "省")
        province:string;
    
        @Model.array(3, Model.string_t, [Model.output], "名称")
        names:Array<string>;
    
    }

    export class Xingzuos extends Model {
    
        @Model.array(1, Model.string_t, [Model.output], "星座名称")
        names:Array<string>;
    
    }

    export class GamesQuery extends Model {
    
        @Model.array(1, GameBriefInfo, [Model.output], "游戏列表")
        games:Array<GameBriefInfo>;
    
        @Model.boolean(2, [Model.input, Model.optional], "开房间")
        buyroom?:boolean;
    
    }

    export class RunningGame extends Model {
    
        @Model.string(1, [Model.input])
        tid:string;
    
        @Model.string(2, [Model.input])
        iid:string;
    
        @Model.string(3, [Model.input])
        rid:string;
    
    }

    export class RunningGameRoomless extends Model {
    
        @Model.string(1, [Model.input])
        tid:string;
    
        @Model.string(2, [Model.input])
        iid:string;
    
        @Model.type(3, Delta, [Model.output])
        delta:Delta;
    
    }

    export class PlayersInGame extends Model {
    
        @Model.string(1, [Model.input], "游戏模板id")
        tid:string;
    
        @Model.string(2, [Model.input], "实例id")
        iid:string;
    
        @Model.string(3, [Model.input], "房间id")
        rid:string;
    
        @Model.array(4, Model.string_t, [Model.output], "房间内的用户列表")
        players:Array<string>;
    
    }

    export class GameSetting extends Model {
    
        @Model.integer(1, [Model.output], "游戏的最小人数")
        playersmin:number;
    
        @Model.integer(2, [Model.output], "游戏的最大人数")
        playersmax:number;
    
        @Model.boolean(3, [Model.output], "是否需要等待用户准备才能开始游戏")
        needready:boolean;
    
    }

    export class GameRunningInfo extends Model {
    
        @Model.string(1, [Model.input])
        tid:string;
    
        @Model.string(2, [Model.input])
        iid:string;
    
        @Model.string(3, [Model.input])
        rid:string;
    
        @Model.type(4, Object, [Model.output], "不同游戏返回不同的运行数据，=null则代表没有运行")
        payload:Object;
    
        @Model.boolean(5, [Model.output], "有没有开始运行")
        running:boolean;
    
    }

    export class RankType extends Model {
    
        @Model.integer(1, [Model.output], "对应配置表里的id")
        index:number;
    
        @Model.string(2, [Model.output], "名称")
        name:string;
    
        @Model.string(3, [Model.output], "图标")
        icon:string;
    
        @Model.array(4, Model.integer_t, [Model.output], "支持的榜单，RankTime")
        times:Array<number>;
    
    }

    export class RankTypes extends Model {
    
        @Model.array(1, RankType, [Model.output])
        items:Array<RankType>;
    
    }

    export class RankItemUser extends Model {
    
        @Model.string(1, [Model.output])
        pid:string;
    
        @Model.string(2, [Model.output])
        pid2:string;
    
    }

    export class RankItem extends Model {
    
        @Model.type(1, Item, [Model.output], "排行榜中对应的数据（生成时的快照）")
        value:Item;
    
        @Model.json(2, [Model.output], "数据承载的对象")
        payload:Object;
    
        @Model.integer(3, [Model.output], "排行")
        rank:number;
    
        @Model.integer(3, [Model.output], "时间")
        time:number;
    
    }

    export class RankQuery extends Model {
    
        @Model.string(1, [Model.input, Model.optional], "用户id")
        pid?:string;
    
        @Model.type(2, RankItem, [Model.output], "信息，未上榜则为空")
        info:RankItem;
    
        @Model.integer(3, [Model.input], "ranktype的id")
        index:number;
    
        @Model.integer(4, [Model.input], "ranktime子榜id")
        timetype:number;
    
    }

    export class RankItems extends Paged {
    
        @Model.integer(1, [Model.input], "ranktype的id")
        index:number;
    
        @Model.integer(2, [Model.input], "ranktime子榜id")
        timetype:number;
    
        @Model.array(3, RankItem, [Model.output], "接收到的对象")
        items:Array<RankItem>;
    
        @Model.array(4, RankItem, [Model.output], "所有对象")
        all:Array<RankItem>;
    
    }

    export class RankInfo extends Model {
    
        @Model.array(1, RankItem, [Model.output], "上期")
        previous:Array<RankItem>;
    
        @Model.array(2, RankItem, [Model.output], "当期")
        current:Array<RankItem>;
    
        @Model.array(3, RankItem, [Model.output], "往期")
        topest:Array<RankItem>;
    
        @Model.type(4, RankItem, [Model.output], "自己")
        my:RankItem;
    
        @Model.integer(5, [Model.input], "ranktype的id")
        index:number;
    
        @Model.integer(6, [Model.input], "ranktime子榜id")
        timetype:number;
    
    }

    export class UserAchievement extends Model {
    
        @Model.integer(1, [Model.input, Model.output], "配表id")
        index:number;
    
        @Model.integer(2, [Model.output], "玩家个人成就的类别")
        show:number;
    
        @Model.boolean(3, [Model.output], "是否已经领取过")
        gotreward:boolean;
    
        @Model.boolean(4, [Model.output], "是否已经达成")
        reach:boolean;
    
        @Model.integer(5, [Model.output], "当前值")
        current:number;
    
        @Model.integer(6, [Model.output], "显示值")
        display:number;
    
    }

    export class UserDailyAchievement extends UserAchievement {
    
        @Model.integer(1, [Model.input, Model.output], "配表id")
        index:number;
    
        @Model.integer(2, [Model.output], "玩家个人成就的类别")
        show:number;
    
        @Model.boolean(3, [Model.output], "是否已经领取过")
        gotreward:boolean;
    
        @Model.boolean(4, [Model.output], "是否已经达成")
        reach:boolean;
    
        @Model.integer(5, [Model.output], "当前值")
        current:number;
    
        @Model.integer(6, [Model.output], "显示值")
        display:number;
    
    }

    export class MyAchievements extends Model {
    
        @Model.integer(1, [Model.input], "分类ctasktype，每日得填0")
        category:number;
    
        @Model.array(2, UserAchievement, [Model.output], "排好序的所有成就/任务")
        items:Array<UserAchievement>;
    
    }

    export class UserAchievements extends Model {
    
        @Model.array(1, UserAchievement, [Model.output], "排好序的所有成就/任务")
        items:Array<UserAchievement>;
    
        @Model.string(2, [Model.input])
        pid:string;
    
    }

    export class CalcUserAchievement extends Model {
    
        @Model.string(1, [Model.input])
        pid:string;
    
        @Model.integer(2, [Model.input])
        index:number;
    
    }

    export class UserGetAchievement extends Model {
    
        @Model.integer(1, [Model.input])
        index:number;
    
        @Model.type(2, Delta, [Model.output])
        delta:Delta;
    
    }

    export class DrawQueState extends Model {
    
        @Model.integer(1, [Model.input, Model.output], "线宽")
        line:number;
    
        @Model.string(2, [Model.output], "画笔的颜色")
        color:string;
    
        @Model.integer(3, [Model.input, Model.output], "画笔的id")
        penid:number;
    
    }

    export class DrawQueElement extends TemplateModel {
    
        @Model.type(1, DrawQueState, [Model.input, Model.output, Model.optional])
        state?:DrawQueState;
    
        @Model.array(2, Model.double_t, [Model.input, Model.output])
        points:Array<number>;
    
        @Model.double(3, [Model.input, Model.output], "间隔时间")
        duration:number;
    
        @Model.string(4, [Model.input, Model.output])
        fid:string;
    
        @Model.string(5, [Model.input, Model.optional])
        rid?:string;
    
    }

    export class DrawQueUndo extends TemplateModel {
    
        @Model.string(1, [Model.input])
        fid:string;
    
        @Model.string(2, [Model.input, Model.optional])
        rid?:string;
    
        @Model.integer(3, [Model.input, Model.optional], "撤销的步数，不传则为撤销全部")
        steps?:number;
    
    }

    export class DrawQueRank extends Model {
    
        @Model.string(1, [Model.output])
        pid:string;
    
        @Model.integer(2, [Model.output])
        score:number;
    
        @Model.integer(3, [Model.output], "从0开始的排行")
        rank:number;
    
        @Model.type(9, Delta, [Model.output], "背包中道具的变更")
        delta:Delta;
    
    }

    export class DrawQueRoundStat extends Model {
    
        @Model.string(1, [Model.input])
        tid:string;
    
        @Model.string(2, [Model.input])
        iid:string;
    
    }

    export class DrawQuePayload extends TemplatePayload {
    
        @Model.string(1, [Model.input, Model.output])
        fid:string;
    
        @Model.type(2, DrawQueElement, [Model.output])
        element:DrawQueElement;
    
        @Model.integer(3, [Model.output], "回退的次数")
        undos:number;
    
        @Model.string(4, [Model.output], "选词的提示")
        wordtips:string;
    
        @Model.string(5, [Model.output], "事件类型")
        event:string;
    
        @Model.string(6, [Model.output], "当前由谁画")
        owner:string;
    
        @Model.string(7, [Model.output], "自动选的词")
        word:string;
    
        @Model.string(8, [Model.output], "谁答对了题")
        who:string;
    
        @Model.array(9, DrawQueRank, [Model.output], "排行")
        ranks:Array<DrawQueRank>;
    
        @Model.integer(10, [Model.output], "宠物id")
        pet:number;
    
        @Model.integer(11, [Model.output], "第几次召唤宠物")
        callPetNum:number;
    
        @Model.boolean(11, [Model.output], "点评的是不是赞")
        admire:boolean;
    
        @Model.string(12, [Model.output], "当前词的长度")
        wordlength:string;
    
        @Model.integer(13, [Model.output], "有没有画家被跳过")
        skips:number;
    
        @Model.array(14, Model.string_t, [Model.output], "当前所有答对人的id")
        rights:Array<string>;
    
        @Model.string(15, [Model.output], "故事表列名,eg:story1")
        storyCol:string;
    
    }

    export class DrawQueAcq extends TemplateModel {
    
        @Model.string(1, [Model.output], "文件id")
        fid:string;
    
        @Model.string(2, [Model.input, Model.optional], "可选的房间id")
        rid?:string;
    
        @Model.string(3, [Model.output])
        owner:string;
    
    }

    export class DrawQueFile extends TemplateModel {
    
        @Model.string(1, [Model.input, Model.output], "文件id")
        fid:string;
    
        @Model.integer(2, [Model.input, Model.output, Model.optional], "词的ID")
        wordid?:number;
    
        @Model.integer(3, [Model.output], "备选词的ID")
        autowordid:number;
    
        @Model.string(4, [Model.output, Model.optional], "直接使用的词，可能因此词不入库，有此值时忽略wordid")
        word?:string;
    
        @Model.array(5, DrawQueElement, [Model.output])
        elements:Array<DrawQueElement>;
    
        @Model.string(6, [Model.output])
        owner:string;
    
    }

    export class DrawQueProgress extends TemplateModel {
    
        @Model.string(1, [Model.input], "房间id")
        rid:string;
    
        @Model.array(2, DrawQueElement, [Model.output])
        elements:Array<DrawQueElement>;
    
        @Model.string(3, [Model.output])
        owner:string;
    
        @Model.integer(4, [Model.output], "倒计时")
        delay:number;
    
        @Model.string(5, [Model.output], "选词的提示")
        wordtips:string;
    
        @Model.string(6, [Model.output], "当前词的长度")
        wordlength:string;
    
    }

    export class DrawQueGameSetting extends GameSetting {
    
        @Model.integer(1, [Model.input, Model.output, Model.optional], "房间类型 paintroom表id")
        type?:number;
    
    }

    export class DrawQueUserInfo extends Model {
    
        @Model.array(1, Model.integer_t, [Model.output], "拥有的画笔的id")
        pens:Array<number>;
    
    }

    export class DrawQueBuyPen extends Model {
    
        @Model.integer(1, [Model.input, Model.output], "pencolor的id")
        id:number;
    
        @Model.type(2, Delta, [Model.output])
        delta:Delta;
    
    }

    export class DrawQueWord extends Model {
    
        @Model.integer(1, [Model.output])
        id:number;
    
        @Model.string(2, [Model.output])
        text:string;
    
        @Model.integer(3, [Model.output])
        pet:number;
    
        @Model.string(4, [Model.output])
        tips:string;
    
        @Model.double(5, [Model.output], "正确率")
        right:number;
    
    }

    export class DrawQueWords extends TemplateModel {
    
        @Model.string(1, [Model.input])
        rid:string;
    
        @Model.string(2, [Model.input])
        fid:string;
    
        @Model.array(3, DrawQueWord, [Model.output])
        items:Array<DrawQueWord>;
    
    }

    export class DrawQueSelectWord extends TemplateModel {
    
        @Model.string(1, [Model.input, Model.output], "文件id")
        fid:string;
    
        @Model.integer(2, [Model.input, Model.optional], "选中的词的id")
        wordid?:number;
    
        @Model.string(3, [Model.input, Model.output, Model.optional], "直接使用的词，可能因此词不入库，有此值时忽略wordid")
        word?:string;
    
        @Model.type(4, Delta, [Model.output])
        delta:Delta;
    
        @Model.string(5, [Model.input, Model.optional])
        rid?:string;
    
    }

    export class DrawerRoundEnd extends TemplateModel {
    
        @Model.string(1, [Model.input], "房间id")
        rid:string;
    
    }

    export class DrawQueUserWord extends Model {
    
        @Model.string(1, [Model.output], "该词的提供者,默认为玩家自己")
        committer:string;
    
        @Model.string(2, [Model.input, Model.output], "词内容")
        word:string;
    
        @Model.string(3, [Model.input, Model.output], "提示语")
        tips:string;
    
    }

    export class DrawQueRunningInfo extends Model {
    
        @Model.string(1, [Model.output], "哪个文件")
        fid:string;
    
        @Model.string(2, [Model.output], "当前画家是谁")
        owner:string;
    
    }

    export class DrawQueControl extends TemplateModel {
    
        @Model.string(1, [Model.input, Model.optional])
        rid?:string;
    
        @Model.string(2, [Model.input, Model.output], "文件id")
        fid:string;
    
    }

    export class DrawQueRoundScore extends Model {
    
        @Model.string(1, [Model.input])
        tid:string;
    
        @Model.string(2, [Model.input])
        iid:string;
    
    }

    export class DrawQueUserStat extends Model {
    
        @Model.string(1, [Model.input])
        tid:string;
    
        @Model.string(2, [Model.input])
        iid:string;
    
    }

    export class DrawQuePetInfo extends TemplateModel {
    
        @Model.integer(1, [Model.input, Model.output])
        id:number;
    
        @Model.boolean(2, [Model.output], "是否已经激活")
        activated:boolean;
    
        @Model.boolean(3, [Model.output], "是否满足条件")
        valid:boolean;
    
        @Model.integer(4, [Model.output], "当前值，只有当查询info时才返回now和need")
        now:number;
    
        @Model.integer(5, [Model.output], "目标值")
        need:number;
    
    }

    export class DrawQueMyPets extends TemplateModel {
    
        @Model.array(1, DrawQuePetInfo, [Model.output], "所有已经满足条件的宠物")
        pets:Array<DrawQuePetInfo>;
    
        @Model.integer(2, [Model.output], "当前佩戴的宠物")
        cur:number;
    
    }

    export class DrawqueShowingPet extends TemplateModel {
    
        @Model.string(1, [Model.input], "玩家pid")
        pid:string;
    
        @Model.integer(2, [Model.output], "当前佩戴的宠物")
        cur:number;
    
    }

    export class DrawQueUsePet extends TemplateModel {
    
        @Model.integer(1, [Model.input], "期望佩戴的宠物id")
        id:number;
    
        @Model.string(2, [Model.input, Model.optional], "房间id，如果是正在画图，必须传rid，用来通知其他人")
        rid?:string;
    
        @Model.type(3, Delta, [Model.output])
        delta:Delta;
    
    }

    export class DrawQueCallPet extends TemplateModel {
    
        @Model.string(2, [Model.input, Model.optional], "房间id，如果是正在画图，必须传rid，用来通知其他人")
        rid?:string;
    
    }

    export class DrawQuePetsReward extends TemplateModel {
    
        @Model.type(1, Delta, [Model.output], "领取的奖励")
        delta:Delta;
    
    }

    export class DrawQueRoundDianping extends TemplateModel {
    
        @Model.string(1, [Model.input])
        rid:string;
    
        @Model.boolean(2, [Model.input], "赞赏，扔鞋子传false")
        admire:boolean;
    
    }

    export class DrawQueGoodFile extends Model {
    
        @Model.string(1, [Model.input])
        tid:string;
    
        @Model.string(2, [Model.input])
        iid:string;
    
    }

    export class DrawQueAvailableRooms extends Model {
    
        @Model.string(1, [Model.input])
        tid:string;
    
        @Model.string(2, [Model.input])
        iid:string;
    
        @Model.array(3, Model.string_t, [Model.output], "房间列表")
        items:Array<string>;
    
        @Model.boolean(4, [Model.input, Model.optional], "强制刷新一次")
        recalc?:boolean;
    
        @Model.integer(5, [Model.input], "房间类型，paintroom的id")
        type:number;
    
    }

    export class DrawQueFastRoom extends Model {
    
        @Model.string(1, [Model.input])
        tid:string;
    
        @Model.string(2, [Model.input])
        iid:string;
    
        @Model.string(3, [Model.output])
        rid:string;
    
        @Model.integer(4, [Model.input], "房间类型，paintroom的id")
        type:number;
    
    }

    export class DrawQueGame extends TemplateModel {
    
        @Model.string(1, [Model.input])
        rid:string;
    
        @Model.string(2, [Model.input])
        gid:string;
    
        @Model.array(3, DrawQueRank, [Model.output])
        ranks:Array<DrawQueRank>;
    
    }

    export class DrawQueUserPlayedRecord extends Model {
    
        @Model.string(1, [Model.input])
        tid:string;
    
        @Model.string(2, [Model.input])
        iid:string;
    
    }

    export class PubchatRoomInfo extends Model {
    
        @Model.string(1, [Model.output])
        tid:string;
    
        @Model.string(2, [Model.output])
        iid:string;
    
        @Model.string(3, [Model.output], "聊天室的rid")
        rid:string;
    
    }

    export class PastlifeScore extends Model {
    
        @Model.string(1, [Model.input])
        id:string;
    
        @Model.integer(2, [Model.input, Model.output], "颜值")
        yanzhi:number;
    
        @Model.integer(3, [Model.input, Model.output], "智商")
        zhishang:number;
    
        @Model.integer(4, [Model.input, Model.output], "爱情")
        aiqing:number;
    
        @Model.integer(5, [Model.input, Model.output], "形成得关系")
        relation:number;
    
        @Model.integer(6, [Model.input, Model.output], "最终得分")
        score:number;
    
    }

    export class PastlifeRound extends Model {
    
        @Model.string(1, [Model.output])
        id:string;
    
        @Model.type(2, PastlifeScore, [Model.output])
        score:PastlifeScore;
    
        @Model.array(3, Item, [Model.output])
        items:Array<Item>;
    
        @Model.string(5, [Model.output])
        partner:string;
    
    }

    export class PastlifeSelectPartner extends Model {
    
        @Model.string(1, [Model.input])
        id:string;
    
        @Model.string(2, [Model.input])
        pid:string;
    
    }

    export class PastlifeQuery extends Model {
    
        @Model.string(1, [Model.input])
        id:string;
    
        @Model.type(2, PastlifeRound, [Model.output])
        info:PastlifeRound;
    
    }

    export class PastlifeRecentlyPlay extends Model {
    
        @Model.string(1, [Model.output])
        id:string;
    
    }

    export class PastlifeSubmit extends Model {
    
        @Model.string(1, [Model.input])
        id:string;
    
        @Model.array(2, Item, [Model.input])
        items:Array<Item>;
    
    }

}

export module routers {

    export let UserLogin = ["user.login", models.LoginInfo, ""];

    export let UserRegister = ["user.register", models.RegisterInfo, ""];

    export let UserLogout = ["user.logout", models.AuthedNull, ""];

    export let UserModify = ["user.modify", models.ModifyUserInfo, "修改用户信息"];

    export let UserModifypassword = ["user.modifypassword", models.ModifyPassword, "修改密码"];

    export let UserBindphone = ["user.bindphone", models.BindPhone, "绑定手机号"];

    export let UserGencode = ["user.gencode", models.GenCode, "获取验证码"];

    export let UserApplycode = ["user.applycode", models.ApplyCode, "提交验证码"];

    export let UserQuery = ["user.query", models.QueryUser, ""];

    export let UserVipinfo = ["user.vipinfo", models.QueryUserVipInfo, ""];

    export let UserAdditem = ["user.additem", models.Item, "测试环境下修改用户背包里的物品"];

    export let UserFlowerto = ["user.flowerto", models.SendFlower, "送花"];

    export let UserPickupmail = ["user.pickupmail", models.Mail, "拾取邮件"];

    export let UserMails = ["user.mails", models.Mails, "所有邮件"];

    export let UserRedpoint = ["user.redpoint", models.Redpoint, "红点"];

    export let UserUploadpicture = ["user.uploadpicture", models.UserPicture, "上传照片"];

    export let UserPictures = ["user.pictures", models.UserPictures, "用户照片"];

    export let UserRemovepicture = ["user.removepicture", models.PictureInfo, "删除照片"];

    export let UserTaskusergift = ["user.taskusergift", models.Null, "执行用户送礼的任务"];

    export let UserTilitime = ["user.tilitime", models.UserTili, "上次恢复体力的时间"];

    export let UserShare = ["user.share", models.UserShare, "请求分享信息"];

    export let UserSharedone = ["user.sharedone", models.UserShare, "分享成功"];

    export let UserInfo = ["user.info", models.UserInfo, "获得当前登录账号的信息"];

    export let UserBindpushid = ["user.bindpushid", models.UserPushId, "绑定推送id"];

    export let PostCompose = ["post.compose", models.PostInfo, "发送一条动态"];

    export let PostQuery = ["post.query", models.Posts, "查询用户的动态列表"];

    export let PostComments = ["post.comments", models.PostComments, "评论信息"];

    export let PostComment = ["post.comment", models.PostMakeComment, "发表一个评论"];

    export let PostView = ["post.view", models.PostView, "记录一次观看"];

    export let PostShare = ["post.share", models.PostShare, "记录一次分享"];

    export let FriendAdd = ["friend.add", models.AddFriend, ""];

    export let FriendAgree = ["friend.agree", models.AddFriend, ""];

    export let FriendRemove = ["friend.remove", models.RemoveFriend, "删除好友"];

    export let FriendList = ["friend.list", models.Friends, "好友列表"];

    export let GroupCreate = ["group.create", models.CreateGroup, ""];

    export let GroupModify = ["group.modify", models.ModifyGroup, ""];

    export let GroupDeluser = ["group.deluser", models.ExitGroup, ""];

    export let GroupExit = ["group.exit", models.ExitGroup, ""];

    export let GroupQuery = ["group.query", models.QueryGroups, ""];

    export let GroupInvite = ["group.invite", models.GroupInvite, ""];

    export let TeamInvite = ["team.invite", models.TeamInvite, "邀请组队"];

    export let TeamAgree = ["team.agree", models.TeamInvite, "同意组队"];

    export let TeamDisagree = ["team.disagree", models.TeamInvite, "拒绝组队"];

    export let TeamExit = ["team.exit", models.AuthedNull, "解除自己的组队状态"];

    export let DatingInvite = ["dating.invite", models.DatingApply, "发起约会"];

    export let DatingAgree = ["dating.agree", models.DatingAgree, "接受约会"];

    export let DatingDisagree = ["dating.disagree", models.DatingDisagree, "拒绝约会"];

    export let DatingExit = ["dating.exit", models.DatingExit, "退出约会"];

    export let DatingAnswer = ["dating.answer", models.DatingAnswer, "约会答题"];

    export let DatingProgress = ["dating.progress", models.DatingProgress, "约会进度"];

    export let DatingAll = ["dating.all", models.DatingUsers, "所有的约会对象"];

    export let DatingRecommend = ["dating.recommend", models.DatingRecommend, "约会主页的推荐约会对象"];

    export let DatingGetrewards = ["dating.getrewards", models.DatingRewards, "领取奖励"];

    export let DatingRewardsinfo = ["dating.rewardsinfo", models.DatingRewardsInfo, "查看自己在该约会中可以领取得奖励"];

    export let GangInfo = ["gang.info", models.GangInfo, ""];

    export let GangGetreward = ["gang.getreward", models.GangGetReward, ""];

    export let GangRevenge = ["gang.revenge", models.GangRevengers, "仇人列表"];

    export let GangRecommend = ["gang.recommend", models.GangRecommends, "推荐的宝宝"];

    export let GangCalcproduce = ["gang.calcproduce", models.GangRecommend, ""];

    export let GangMembers = ["gang.members", models.GangMembers, "宝宝列表"];

    export let GangIgnore = ["gang.ignore", models.GangRevengerIgnore, "忽略仇人抢夺宝宝的纪录"];

    export let GangAddproduce = ["gang.addproduce", models.GangMemberProduce, "测试增加宝宝的产出"];

    export let GangGrab = ["gang.grab", models.GangGrabMember, "抢夺他"];

    export let GangGrabcost = ["gang.grabcost", models.GangUserCost, "抢夺的消耗计算"];

    export let GangTaskstat = ["gang.taskstat", models.Null, "结算一次"];

    export let GangOfferme = ["gang.offerme", models.GangOfferMember, "自荐为超级宝宝"];

    export let MsgChat = ["msg.chat", models.ImSendChat, "发送聊天消息"];

    export let HomeInfo = ["home.info", models.HomeInfo, ""];

    export let RoomTypes = ["room.types", models.RoomTypes, ""];

    export let RoomCreate = ["room.create", models.CreateRoomInfo, ""];

    export let RoomModify = ["room.modify", models.ModifyRoomInfo, ""];

    export let RoomRenew = ["room.renew", models.RenewRoom, ""];

    export let RoomQuery = ["room.query", models.QueryRooms, "房间列表，如果不带tid等参数，则查询的是自己开的房间列表"];

    export let RoomUsersin = ["room.usersin", models.UsersInRoom, "列出房间内的用户列表"];

    export let RoomReady = ["room.ready", models.UserReady, "设置等待状态"];

    export let RoomJoin = ["room.join", models.RoomJoin, "加入房间"];

    export let RoomLeave = ["room.leave", models.RoomLeave, "离开房间"];

    export let RoomExit = ["room.exit", models.RoomExit, "退出房间"];

    export let RoomInvite = ["room.invite", models.RoomInvite, "邀请好友"];

    export let RoomAgree = ["room.agree", models.RoomAgree, "同意加入房间"];

    export let RoomRecently = ["room.recently", models.RecentlyRooms, ""];

    export let RoomAvailable = ["room.available", models.AvailableRooms, ""];

    export let RoomFast = ["room.fast", models.FastRoom, "取得可以快速开始的房间"];

    export let RoomTaskroomusers = ["room.taskroomusers", models.Null, "执行刷新房间人数的任务"];

    export let RoomWatch = ["room.watch", models.RoomWatcher, "观看"];

    export let RoomUnwatch = ["room.unwatch", models.RoomWatcher, "退出观看"];

    export let ShopRecharge = ["shop.recharge", models.RechargeRecord, "货币充值为平台内道具"];

    export let ShopBuyvip = ["shop.buyvip", models.BuyVipRecord, "平台内购买"];

    export let ShopBuyitem = ["shop.buyitem", models.BuyItem, ""];

    export let ShopDone = ["shop.done", models.Null, "支付成功回调"];

    export let ShopExchange = ["shop.exchange", models.ExchangeItem, "兑换"];

    export let ShopTestpay = ["shop.testpay", models.TestOrder, "测试收单"];

    export let SettingRegions = ["setting.regions", models.Regions, ""];

    export let SettingProvinces = ["setting.provinces", models.Provinces, ""];

    export let SettingCitys = ["setting.citys", models.Citys, ""];

    export let SettingXingzuos = ["setting.xingzuos", models.Xingzuos, ""];

    export let GameQuery = ["game.query", models.GamesQuery, "列出当前可以用的游戏列表"];

    export let GameRunninginfo = ["game.runninginfo", models.GameRunningInfo, "获得当前房间相关的游戏的运行信息"];

    export let GamePlayers = ["game.players", models.PlayersInGame, "游戏里的玩家"];

    export let GameStart = ["game.start", models.RunningGame, "开始游戏"];

    export let GameStartroomless = ["game.startroomless", models.RunningGameRoomless, "开始一场不需要房间的游戏"];

    export let GameStop = ["game.stop", models.RunningGame, "结束游戏"];

    export let GameStoproomless = ["game.stoproomless", models.RunningGameRoomless, "结束不需要房间的游戏"];

    export let RankQuery = ["rank.query", models.RankQuery, ""];

    export let RankTypes = ["rank.types", models.RankTypes, ""];

    export let RankItems = ["rank.items", models.RankItems, ""];

    export let RankInfo = ["rank.info", models.RankInfo, ""];

    export let RankFlush = ["rank.flush", models.AuthedNull, "强刷一次排行榜"];

    export let AchieveMystats = ["achieve.mystats", models.MyAchievements, "取得我的当前成就"];

    export let AchieveUserstats = ["achieve.userstats", models.UserAchievements, "别人的成就"];

    export let AchieveGetachievement = ["achieve.getachievement", models.UserGetAchievement, ""];

    export let AchieveRecalc = ["achieve.recalc", models.CalcUserAchievement, "重新计算是否满足"];

    export let DrawqueWords = ["drawque.words", models.DrawQueWords, "候选词"];

    export let DrawqueWordspersonal = ["drawque.wordspersonal", models.DrawQueWords, "个人画室候选词"];

    export let DrawqueSelectword = ["drawque.selectword", models.DrawQueSelectWord, "选词"];

    export let DrawqueRoundend = ["drawque.roundend", models.DrawerRoundEnd, "画家提前结束创作"];

    export let DrawqueSelectwordpersonal = ["drawque.selectwordpersonal", models.DrawQueSelectWord, "个人画室选择一个词"];

    export let DrawqueAdd = ["drawque.add", models.DrawQueElement, "添加一组数据"];

    export let DrawqueUndo = ["drawque.undo", models.DrawQueUndo, ""];

    export let DrawqueQuery = ["drawque.query", models.DrawQueFile, "根据fid查询到一套完整的数据"];

    export let DrawqueUserinfo = ["drawque.userinfo", models.DrawQueUserInfo, "获得当前用户的笔触等信息"];

    export let DrawqueBuypen = ["drawque.buypen", models.DrawQueBuyPen, "购买一只笔"];

    export let DrawqueCommitword = ["drawque.commitword", models.DrawQueUserWord, "玩家提供词汇"];

    export let DrawqueFavor = ["drawque.favor", models.DrawQueControl, "收藏一份"];

    export let DrawqueNextround = ["drawque.nextround", models.DrawQueControl, "下一回合"];

    export let DrawqueStatgame = ["drawque.statgame", models.DrawQueGame, ""];

    export let DrawquePets = ["drawque.pets", models.DrawQueMyPets, "列出当前宠物状态，只列出可用的"];

    export let DrawquePetinfo = ["drawque.petinfo", models.DrawQuePetInfo, "宠物信息"];

    export let DrawqueShowingpet = ["drawque.showingpet", models.DrawqueShowingPet, "该玩家携带（显示）的宠物"];

    export let DrawqueActivepet = ["drawque.activepet", models.DrawQueUsePet, "激活宠物"];

    export let DrawqueUsepet = ["drawque.usepet", models.DrawQueUsePet, "佩戴宠物"];

    export let DrawqueCallpet = ["drawque.callpet", models.DrawQueCallPet, "召唤宠物"];

    export let DrawquePetrewards = ["drawque.petrewards", models.DrawQuePetsReward, "领奖"];

    export let DrawqueDianping = ["drawque.dianping", models.DrawQueRoundDianping, "点评"];

    export let DrawqueRoomavailable = ["drawque.roomavailable", models.DrawQueAvailableRooms, "可用的房间"];

    export let DrawqueFast = ["drawque.fast", models.DrawQueFastRoom, "取得可以快速开始的房间"];

    export let DrawqueProgress = ["drawque.progress", models.DrawQueProgress, ""];

    export let PubchatInfo = ["pubchat.info", models.PubchatRoomInfo, ""];

    export let PastlifeAcquire = ["pastlife.acquire", models.PastlifeRound, ""];

    export let PastlifeSubmit = ["pastlife.submit", models.PastlifeSubmit, ""];

    export let PastlifeQuery = ["pastlife.query", models.PastlifeQuery, ""];

    export let PastlifeRecentlyplay = ["pastlife.recentlyplay", models.PastlifeRecentlyPlay, ""];

    export let PastlifeScore = ["pastlife.score", models.PastlifeScore, ""];

    export let PastlifeSelectpartner = ["pastlife.selectpartner", models.PastlifeSelectPartner, ""];

}

export module api {

    export function UserLogin():models.LoginInfo {
    return Model.NewRequest(routers.UserLogin);
    }

    export function UserRegister():models.RegisterInfo {
    return Model.NewRequest(routers.UserRegister);
    }

    export function UserLogout():models.AuthedNull {
    return Model.NewRequest(routers.UserLogout);
    }

    export function UserModify():models.ModifyUserInfo {
    return Model.NewRequest(routers.UserModify);
    }

    export function UserModifypassword():models.ModifyPassword {
    return Model.NewRequest(routers.UserModifypassword);
    }

    export function UserBindphone():models.BindPhone {
    return Model.NewRequest(routers.UserBindphone);
    }

    export function UserGencode():models.GenCode {
    return Model.NewRequest(routers.UserGencode);
    }

    export function UserApplycode():models.ApplyCode {
    return Model.NewRequest(routers.UserApplycode);
    }

    export function UserQuery():models.QueryUser {
    return Model.NewRequest(routers.UserQuery);
    }

    export function UserVipinfo():models.QueryUserVipInfo {
    return Model.NewRequest(routers.UserVipinfo);
    }

    export function UserAdditem():models.Item {
    return Model.NewRequest(routers.UserAdditem);
    }

    export function UserFlowerto():models.SendFlower {
    return Model.NewRequest(routers.UserFlowerto);
    }

    export function UserPickupmail():models.Mail {
    return Model.NewRequest(routers.UserPickupmail);
    }

    export function UserMails():models.Mails {
    return Model.NewRequest(routers.UserMails);
    }

    export function UserRedpoint():models.Redpoint {
    return Model.NewRequest(routers.UserRedpoint);
    }

    export function UserUploadpicture():models.UserPicture {
    return Model.NewRequest(routers.UserUploadpicture);
    }

    export function UserPictures():models.UserPictures {
    return Model.NewRequest(routers.UserPictures);
    }

    export function UserRemovepicture():models.PictureInfo {
    return Model.NewRequest(routers.UserRemovepicture);
    }

    export function UserTaskusergift():models.Null {
    return Model.NewRequest(routers.UserTaskusergift);
    }

    export function UserTilitime():models.UserTili {
    return Model.NewRequest(routers.UserTilitime);
    }

    export function UserShare():models.UserShare {
    return Model.NewRequest(routers.UserShare);
    }

    export function UserSharedone():models.UserShare {
    return Model.NewRequest(routers.UserSharedone);
    }

    export function UserInfo():models.UserInfo {
    return Model.NewRequest(routers.UserInfo);
    }

    export function UserBindpushid():models.UserPushId {
    return Model.NewRequest(routers.UserBindpushid);
    }

    export function PostCompose():models.PostInfo {
    return Model.NewRequest(routers.PostCompose);
    }

    export function PostQuery():models.Posts {
    return Model.NewRequest(routers.PostQuery);
    }

    export function PostComments():models.PostComments {
    return Model.NewRequest(routers.PostComments);
    }

    export function PostComment():models.PostMakeComment {
    return Model.NewRequest(routers.PostComment);
    }

    export function PostView():models.PostView {
    return Model.NewRequest(routers.PostView);
    }

    export function PostShare():models.PostShare {
    return Model.NewRequest(routers.PostShare);
    }

    export function FriendAdd():models.AddFriend {
    return Model.NewRequest(routers.FriendAdd);
    }

    export function FriendAgree():models.AddFriend {
    return Model.NewRequest(routers.FriendAgree);
    }

    export function FriendRemove():models.RemoveFriend {
    return Model.NewRequest(routers.FriendRemove);
    }

    export function FriendList():models.Friends {
    return Model.NewRequest(routers.FriendList);
    }

    export function GroupCreate():models.CreateGroup {
    return Model.NewRequest(routers.GroupCreate);
    }

    export function GroupModify():models.ModifyGroup {
    return Model.NewRequest(routers.GroupModify);
    }

    export function GroupDeluser():models.ExitGroup {
    return Model.NewRequest(routers.GroupDeluser);
    }

    export function GroupExit():models.ExitGroup {
    return Model.NewRequest(routers.GroupExit);
    }

    export function GroupQuery():models.QueryGroups {
    return Model.NewRequest(routers.GroupQuery);
    }

    export function GroupInvite():models.GroupInvite {
    return Model.NewRequest(routers.GroupInvite);
    }

    export function TeamInvite():models.TeamInvite {
    return Model.NewRequest(routers.TeamInvite);
    }

    export function TeamAgree():models.TeamInvite {
    return Model.NewRequest(routers.TeamAgree);
    }

    export function TeamDisagree():models.TeamInvite {
    return Model.NewRequest(routers.TeamDisagree);
    }

    export function TeamExit():models.AuthedNull {
    return Model.NewRequest(routers.TeamExit);
    }

    export function DatingInvite():models.DatingApply {
    return Model.NewRequest(routers.DatingInvite);
    }

    export function DatingAgree():models.DatingAgree {
    return Model.NewRequest(routers.DatingAgree);
    }

    export function DatingDisagree():models.DatingDisagree {
    return Model.NewRequest(routers.DatingDisagree);
    }

    export function DatingExit():models.DatingExit {
    return Model.NewRequest(routers.DatingExit);
    }

    export function DatingAnswer():models.DatingAnswer {
    return Model.NewRequest(routers.DatingAnswer);
    }

    export function DatingProgress():models.DatingProgress {
    return Model.NewRequest(routers.DatingProgress);
    }

    export function DatingAll():models.DatingUsers {
    return Model.NewRequest(routers.DatingAll);
    }

    export function DatingRecommend():models.DatingRecommend {
    return Model.NewRequest(routers.DatingRecommend);
    }

    export function DatingGetrewards():models.DatingRewards {
    return Model.NewRequest(routers.DatingGetrewards);
    }

    export function DatingRewardsinfo():models.DatingRewardsInfo {
    return Model.NewRequest(routers.DatingRewardsinfo);
    }

    export function GangInfo():models.GangInfo {
    return Model.NewRequest(routers.GangInfo);
    }

    export function GangGetreward():models.GangGetReward {
    return Model.NewRequest(routers.GangGetreward);
    }

    export function GangRevenge():models.GangRevengers {
    return Model.NewRequest(routers.GangRevenge);
    }

    export function GangRecommend():models.GangRecommends {
    return Model.NewRequest(routers.GangRecommend);
    }

    export function GangCalcproduce():models.GangRecommend {
    return Model.NewRequest(routers.GangCalcproduce);
    }

    export function GangMembers():models.GangMembers {
    return Model.NewRequest(routers.GangMembers);
    }

    export function GangIgnore():models.GangRevengerIgnore {
    return Model.NewRequest(routers.GangIgnore);
    }

    export function GangAddproduce():models.GangMemberProduce {
    return Model.NewRequest(routers.GangAddproduce);
    }

    export function GangGrab():models.GangGrabMember {
    return Model.NewRequest(routers.GangGrab);
    }

    export function GangGrabcost():models.GangUserCost {
    return Model.NewRequest(routers.GangGrabcost);
    }

    export function GangTaskstat():models.Null {
    return Model.NewRequest(routers.GangTaskstat);
    }

    export function GangOfferme():models.GangOfferMember {
    return Model.NewRequest(routers.GangOfferme);
    }

    export function MsgChat():models.ImSendChat {
    return Model.NewRequest(routers.MsgChat);
    }

    export function HomeInfo():models.HomeInfo {
    return Model.NewRequest(routers.HomeInfo);
    }

    export function RoomTypes():models.RoomTypes {
    return Model.NewRequest(routers.RoomTypes);
    }

    export function RoomCreate():models.CreateRoomInfo {
    return Model.NewRequest(routers.RoomCreate);
    }

    export function RoomModify():models.ModifyRoomInfo {
    return Model.NewRequest(routers.RoomModify);
    }

    export function RoomRenew():models.RenewRoom {
    return Model.NewRequest(routers.RoomRenew);
    }

    export function RoomQuery():models.QueryRooms {
    return Model.NewRequest(routers.RoomQuery);
    }

    export function RoomUsersin():models.UsersInRoom {
    return Model.NewRequest(routers.RoomUsersin);
    }

    export function RoomReady():models.UserReady {
    return Model.NewRequest(routers.RoomReady);
    }

    export function RoomJoin():models.RoomJoin {
    return Model.NewRequest(routers.RoomJoin);
    }

    export function RoomLeave():models.RoomLeave {
    return Model.NewRequest(routers.RoomLeave);
    }

    export function RoomExit():models.RoomExit {
    return Model.NewRequest(routers.RoomExit);
    }

    export function RoomInvite():models.RoomInvite {
    return Model.NewRequest(routers.RoomInvite);
    }

    export function RoomAgree():models.RoomAgree {
    return Model.NewRequest(routers.RoomAgree);
    }

    export function RoomRecently():models.RecentlyRooms {
    return Model.NewRequest(routers.RoomRecently);
    }

    export function RoomAvailable():models.AvailableRooms {
    return Model.NewRequest(routers.RoomAvailable);
    }

    export function RoomFast():models.FastRoom {
    return Model.NewRequest(routers.RoomFast);
    }

    export function RoomTaskroomusers():models.Null {
    return Model.NewRequest(routers.RoomTaskroomusers);
    }

    export function RoomWatch():models.RoomWatcher {
    return Model.NewRequest(routers.RoomWatch);
    }

    export function RoomUnwatch():models.RoomWatcher {
    return Model.NewRequest(routers.RoomUnwatch);
    }

    export function ShopRecharge():models.RechargeRecord {
    return Model.NewRequest(routers.ShopRecharge);
    }

    export function ShopBuyvip():models.BuyVipRecord {
    return Model.NewRequest(routers.ShopBuyvip);
    }

    export function ShopBuyitem():models.BuyItem {
    return Model.NewRequest(routers.ShopBuyitem);
    }

    export function ShopDone():models.Null {
    return Model.NewRequest(routers.ShopDone);
    }

    export function ShopExchange():models.ExchangeItem {
    return Model.NewRequest(routers.ShopExchange);
    }

    export function ShopTestpay():models.TestOrder {
    return Model.NewRequest(routers.ShopTestpay);
    }

    export function SettingRegions():models.Regions {
    return Model.NewRequest(routers.SettingRegions);
    }

    export function SettingProvinces():models.Provinces {
    return Model.NewRequest(routers.SettingProvinces);
    }

    export function SettingCitys():models.Citys {
    return Model.NewRequest(routers.SettingCitys);
    }

    export function SettingXingzuos():models.Xingzuos {
    return Model.NewRequest(routers.SettingXingzuos);
    }

    export function GameQuery():models.GamesQuery {
    return Model.NewRequest(routers.GameQuery);
    }

    export function GameRunninginfo():models.GameRunningInfo {
    return Model.NewRequest(routers.GameRunninginfo);
    }

    export function GamePlayers():models.PlayersInGame {
    return Model.NewRequest(routers.GamePlayers);
    }

    export function GameStart():models.RunningGame {
    return Model.NewRequest(routers.GameStart);
    }

    export function GameStartroomless():models.RunningGameRoomless {
    return Model.NewRequest(routers.GameStartroomless);
    }

    export function GameStop():models.RunningGame {
    return Model.NewRequest(routers.GameStop);
    }

    export function GameStoproomless():models.RunningGameRoomless {
    return Model.NewRequest(routers.GameStoproomless);
    }

    export function RankQuery():models.RankQuery {
    return Model.NewRequest(routers.RankQuery);
    }

    export function RankTypes():models.RankTypes {
    return Model.NewRequest(routers.RankTypes);
    }

    export function RankItems():models.RankItems {
    return Model.NewRequest(routers.RankItems);
    }

    export function RankInfo():models.RankInfo {
    return Model.NewRequest(routers.RankInfo);
    }

    export function RankFlush():models.AuthedNull {
    return Model.NewRequest(routers.RankFlush);
    }

    export function AchieveMystats():models.MyAchievements {
    return Model.NewRequest(routers.AchieveMystats);
    }

    export function AchieveUserstats():models.UserAchievements {
    return Model.NewRequest(routers.AchieveUserstats);
    }

    export function AchieveGetachievement():models.UserGetAchievement {
    return Model.NewRequest(routers.AchieveGetachievement);
    }

    export function AchieveRecalc():models.CalcUserAchievement {
    return Model.NewRequest(routers.AchieveRecalc);
    }

    export function DrawqueWords():models.DrawQueWords {
    return Model.NewRequest(routers.DrawqueWords);
    }

    export function DrawqueWordspersonal():models.DrawQueWords {
    return Model.NewRequest(routers.DrawqueWordspersonal);
    }

    export function DrawqueSelectword():models.DrawQueSelectWord {
    return Model.NewRequest(routers.DrawqueSelectword);
    }

    export function DrawqueRoundend():models.DrawerRoundEnd {
    return Model.NewRequest(routers.DrawqueRoundend);
    }

    export function DrawqueSelectwordpersonal():models.DrawQueSelectWord {
    return Model.NewRequest(routers.DrawqueSelectwordpersonal);
    }

    export function DrawqueAdd():models.DrawQueElement {
    return Model.NewRequest(routers.DrawqueAdd);
    }

    export function DrawqueUndo():models.DrawQueUndo {
    return Model.NewRequest(routers.DrawqueUndo);
    }

    export function DrawqueQuery():models.DrawQueFile {
    return Model.NewRequest(routers.DrawqueQuery);
    }

    export function DrawqueUserinfo():models.DrawQueUserInfo {
    return Model.NewRequest(routers.DrawqueUserinfo);
    }

    export function DrawqueBuypen():models.DrawQueBuyPen {
    return Model.NewRequest(routers.DrawqueBuypen);
    }

    export function DrawqueCommitword():models.DrawQueUserWord {
    return Model.NewRequest(routers.DrawqueCommitword);
    }

    export function DrawqueFavor():models.DrawQueControl {
    return Model.NewRequest(routers.DrawqueFavor);
    }

    export function DrawqueNextround():models.DrawQueControl {
    return Model.NewRequest(routers.DrawqueNextround);
    }

    export function DrawqueStatgame():models.DrawQueGame {
    return Model.NewRequest(routers.DrawqueStatgame);
    }

    export function DrawquePets():models.DrawQueMyPets {
    return Model.NewRequest(routers.DrawquePets);
    }

    export function DrawquePetinfo():models.DrawQuePetInfo {
    return Model.NewRequest(routers.DrawquePetinfo);
    }

    export function DrawqueShowingpet():models.DrawqueShowingPet {
    return Model.NewRequest(routers.DrawqueShowingpet);
    }

    export function DrawqueActivepet():models.DrawQueUsePet {
    return Model.NewRequest(routers.DrawqueActivepet);
    }

    export function DrawqueUsepet():models.DrawQueUsePet {
    return Model.NewRequest(routers.DrawqueUsepet);
    }

    export function DrawqueCallpet():models.DrawQueCallPet {
    return Model.NewRequest(routers.DrawqueCallpet);
    }

    export function DrawquePetrewards():models.DrawQuePetsReward {
    return Model.NewRequest(routers.DrawquePetrewards);
    }

    export function DrawqueDianping():models.DrawQueRoundDianping {
    return Model.NewRequest(routers.DrawqueDianping);
    }

    export function DrawqueRoomavailable():models.DrawQueAvailableRooms {
    return Model.NewRequest(routers.DrawqueRoomavailable);
    }

    export function DrawqueFast():models.DrawQueFastRoom {
    return Model.NewRequest(routers.DrawqueFast);
    }

    export function DrawqueProgress():models.DrawQueProgress {
    return Model.NewRequest(routers.DrawqueProgress);
    }

    export function PubchatInfo():models.PubchatRoomInfo {
    return Model.NewRequest(routers.PubchatInfo);
    }

    export function PastlifeAcquire():models.PastlifeRound {
    return Model.NewRequest(routers.PastlifeAcquire);
    }

    export function PastlifeSubmit():models.PastlifeSubmit {
    return Model.NewRequest(routers.PastlifeSubmit);
    }

    export function PastlifeQuery():models.PastlifeQuery {
    return Model.NewRequest(routers.PastlifeQuery);
    }

    export function PastlifeRecentlyplay():models.PastlifeRecentlyPlay {
    return Model.NewRequest(routers.PastlifeRecentlyplay);
    }

    export function PastlifeScore():models.PastlifeScore {
    return Model.NewRequest(routers.PastlifeScore);
    }

    export function PastlifeSelectpartner():models.PastlifeSelectPartner {
    return Model.NewRequest(routers.PastlifeSelectpartner);
    }

}

Model.BindImpl(api, models, routers);
