import {IndexedObject} from "./kernel";
import {logger} from "./logger";
import {colinteger} from "../store/proto";

export type DateTimeRange = {
    from: number, // 开始
    to: number // 结束，比如小时 [0, 60)
};

export function Defer(proc: Function) {
    process.nextTick(proc);
}

export type DelayHandler = number;
export type RepeatHandler = number;

export function Delay(seconds: number, proc: Function): DelayHandler {
    return setTimeout(proc, seconds * 1000);
}

export function CancelDelay(hdl: DelayHandler) {
    clearTimeout(hdl);
}

export function Repeat(seconds: number, proc: Function): RepeatHandler {
    return setInterval(proc, seconds * 1000);
}

export function CancelRepeat(hdl: RepeatHandler) {
    clearInterval(hdl);
}

export class Timeout {

    constructor(time: number, proc: Function, autostart = true) {
        this._time = time;
        this._proc = proc;
        if (autostart)
            this.start();
    }

    start(): boolean {
        if (this._hdl) {
            logger.fatal("定时器已经开始执行");
            return;
        }

        this._hdl = Delay(this._time, () => {
            this._proc();
            this._hdl = null;
        });
    }

    stop() {
        if (!this._hdl)
            return;
        CancelDelay(this._hdl);
        this._hdl = null;
    }

    private _time: number;
    private _proc: Function;
    private _hdl: DelayHandler;
}

// 手动对时间进行流失
export class TimeoutManual {

    constructor(time: number, proc: Function, autostart = true) {
        this.time = time;
        this._proc = proc;
        if (autostart)
            this.start();
    }

    start(): boolean {
        if (this._hdl) {
            logger.fatal("定时器已经开始执行");
            return;
        }

        this._hdl = {};
        this.now = 0;
    }

    stop() {
        if (!this._hdl)
            return;
        this._hdl = null;
    }

    elapse(seconds: number = 1) {
        if (!this._hdl)
            return;
        this.now += seconds;
        if (this.now >= this.time) {
            this._proc();
            this._hdl = null;
        }
    }

    @colinteger()
    time: number;

    @colinteger()
    now: number;

    private _proc: Function;
    private _hdl: IndexedObject;
}

export class Interval {

    constructor(time: number, proc: Function, autostart = true) {
        this._time = time;
        this._proc = proc;
        if (autostart)
            this.start();
    }

    start(): boolean {
        if (this._hdl) {
            logger.fatal("定时器已经开始执行");
            return;
        }

        this._hdl = Repeat(this._time, () => {
            this._proc();
        });
    }

    stop() {
        if (!this._hdl)
            return;
        CancelRepeat(this._hdl);
        this._hdl = null;
    }

    private _time: number;
    private _proc: Function;
    private _hdl: RepeatHandler;
}

// 延迟几帧加载
export function SkipFrame(n: number, proc: Function) {
    process.nextTick(() => {
        if (n == 0) {
            proc();
            return;
        }
        SkipFrame(n - 1, proc);
    });
}

// 从cygwin里面运行时tz会导致拿出的hours错误
let TIMEZONE = "Asia/Shanghai";
if (process.env.TZ != null) {
    console.error("必须要保证process.env.TZ为空，否则时区会有问题");
    process.exit(-1);
}

export function InstanceDate(): Date {
    let dt = new Date();
    return dt;
}

export class DateTime {

    constructor(ts?: number) {
        if (ts === undefined)
            ts = DateTime.Now();
        this.timestamp = ts;
    }

    // 获取当前时间戳，默认整个环境中单位为秒
    // 如果环节中强制只能为int，则对应用的地方再转换成int，否则默认都是float，避免排序时丧失精度
    static Now(): number {
        return new Date().getTime() / 1000; // timestamp没有时区的概念
    }

    static Current(): number {
        return (new Date().getTime() / 1000) >> 0;
    }

    /** 从字符串转换 */
    static Parse(s: string): DateTime {
        let v = Date.parse(s);
        // safari下日期必须用/分割，但是chrome支持-或者/的格式，所以如果是NaN，则把所有的-转换成/
        if (isNaN(v)) {
            if (s.indexOf('-') != -1) {
                s = s.replace(/-/g, '/');
                v = Date.parse(s);
            }
        }
        return new DateTime(v / 1000);
    }

    /** 未来 */
    future(ts: number): this {
        this.timestamp += ts;
        return this;
    }

    /** 过去 */
    past(ts: number): this {
        this.timestamp -= ts;
        return this;
    }

    /** 计算间隔 */
    diff(r: DateTime): DateTime {
        return new DateTime(r._timestamp - this._timestamp);
    }

    private _changed = false;
    private _date = InstanceDate(); // 必须带时区
    private _timestamp: number;
    get timestamp(): number {
        if (this._changed) {
            this._timestamp = this._date.getTime() / 1000;
            this._changed = false;
        }
        return this._timestamp;
    }

    set timestamp(val: number) {
        if (this._timestamp === val)
            return;
        this._timestamp = val;
        this._date.setTime(this._timestamp * 1000);
    }

    get time(): number {
        return this.timestamp;
    }

    get year(): number {
        return this._date.getFullYear();
    }

    set year(val: number) {
        this._changed = true;
        this._date.setFullYear(val);
    }

    get month(): number {
        return this._date.getMonth();
    }

    set month(val: number) {
        this._changed = true;
        this._date.setMonth(val);
    }

    get day(): number {
        return this._date.getDate() - 1;
    }

    set day(val: number) {
        this._changed = true;
        this._date.setDate(val + 1);
    }

    get hyear(): number {
        return this.year;
    }

    set hyear(val: number) {
        this.year = val;
    }

    get hmonth(): number {
        return this.month + 1;
    }

    set hmonth(val: number) {
        this.month = val - 1;
    }

    get hday(): number {
        return this.day + 1;
    }

    set hday(val: number) {
        this.day = val - 1;
    }

    get hour(): number {
        return this._date.getHours();
    }

    set hour(val: number) {
        this._changed = true;
        this._date.setHours(val);
    }

    get minute(): number {
        return this._date.getMinutes();
    }

    set minute(val: number) {
        this._changed = true;
        this._date.setMinutes(val);
    }

    get second(): number {
        return this._date.getSeconds();
    }

    set second(val: number) {
        this._changed = true;
        this._date.setSeconds(val);
    }

    get weekday(): number {
        return this._date.getDay() - 1;
    }

    get hweekday(): number {
        return this._date.getDay();
    }

    /**
     * 对Date的扩展，将 Date 转化为指定格式的String
     * 月(M)、日(d)、12小时(h)、24小时(H)、分(m)、秒(s)、周(E)、季度(q) 可以用 1-2 个占位符
     * 年(y)可以用 1-4 个占位符，毫秒(S)只能用 1 个占位符(是 1-3 位的数字)
     * eg:
     * ("yyyy-MM-dd hh:mm:ss.S") ==> 2006-07-02 08:09:04.423
     * ("yyyy-MM-dd E HH:mm:ss") ==> 2009-03-10 二 20:09:04
     * ("yyyy-MM-dd EE hh:mm:ss") ==> 2009-03-10 周二 08:09:04
     * ("yyyy-MM-dd EEE hh:mm:ss") ==> 2009-03-10 星期二 08:09:04
     * ("yyyy-M-d h:m:s.S") ==> 2006-7-2 8:9:4.18
     */
    toString(fmt?: any): string {
        if (fmt)
            return (<any>this._date).pattern(fmt);
        return this._date.toString();
    }

    static MINUTE = 60;
    static MINUTE_5 = 300;
    static MINUTE_15 = 900;
    static MINUTE_30 = 1800;
    static HOUR = 3600;
    static HOUR_2 = 7200;
    static HOUR_6 = 21600;
    static HOUR_12 = 43200;
    static DAY = 86400;
    static WEEK = 604800;
    static MONTH = 2592000;
    static YEAR = 31104000;

    static Dyears(ts: number, up: boolean = true) {
        return Math.floor(ts / this.YEAR);
    }

    static Dmonths(ts: number, up: boolean = true) {
        let v;
        if (up) {
            v = ts % this.YEAR;
            v = Math.floor(v / this.MONTH);
        } else {
            v = Math.floor(ts / this.MONTH);
        }
        return v;
    }

    static Ddays(ts: number, up: boolean = true) {
        let v;
        if (up) {
            v = ts % this.MONTH;
            v = Math.floor(v / this.DAY);
        } else {
            v = Math.floor(ts / this.DAY);
        }
        return v;
    }

    static Dhours(ts: number, up: boolean = true) {
        let v;
        if (up) {
            v = ts % this.DAY;
            v = Math.floor(v / this.HOUR);
        } else {
            v = Math.floor(ts / this.HOUR);
        }
        return v;
    }

    static Dminutes(ts: number, up: boolean = true) {
        let v;
        if (up) {
            v = ts % this.HOUR;
            v = Math.floor(v / this.MINUTE);
        } else {
            v = Math.floor(ts / this.MINUTE);
        }
        return v;
    }

    static Dseconds(ts: number, up: boolean = true) {
        let v;
        if (up) {
            v = ts % this.MINUTE;
        } else {
            v = ts;
        }
        return v;
    }

    /** 计算diff-year，根绝suffix的类型返回对应的类型 */
    dyears(up: boolean = true, suffix: any | string = 0): any {
        let v = DateTime.Dyears(this._timestamp, up);
        if (typeof(suffix) == 'string')
            return v ? v + suffix : '';
        return v + suffix;
    }

    /** 计算diff-months */
    dmonths(up: boolean = true, suffix: any | string = 0): any {
        let v = DateTime.Dmonths(this._timestamp, up);
        if (typeof(suffix) == 'string')
            return v ? v + suffix : '';
        return v + suffix;
    }

    /** 计算diff-days */
    ddays(up: boolean = true, suffix: any | string = 0): any {
        let v = DateTime.Ddays(this._timestamp, up);
        if (typeof(suffix) == 'string')
            return v ? v + suffix : '';
        return v + suffix;
    }

    /** 计算diff-hours */
    dhours(up: boolean = true, suffix: any | string = 0): any {
        let v = DateTime.Dhours(this._timestamp, up);
        if (typeof(suffix) == 'string')
            return v ? v + suffix : '';
        return v + suffix;
    }

    /** 计算diff-mins */
    dminutes(up: boolean = true, suffix: any | string = 0): any {
        let v = DateTime.Dminutes(this._timestamp, up);
        if (typeof(suffix) == 'string')
            return v ? v + suffix : '';
        return v + suffix;
    }

    /** 计算diff-secs */
    dseconds(up: boolean = true, suffix: any | string = 0): any {
        let v = DateTime.Dseconds(this._timestamp, up);
        if (typeof(suffix) == 'string')
            return v ? v + suffix : '';
        return v + suffix;
    }

    isSameDay(r: DateTime): boolean {
        return this.year == r.year &&
            this.month == r.month &&
            this.day == r.day;
    }

    // 当前分钟的起始
    minuteRange(): DateTimeRange {
        let from = (this.timestamp - this.second) >> 0;
        return {
            from: from,
            to: from + 60 - 1 // 整数算在下一刻
        };
    }

    // 当前小时的起始
    hourRange(): DateTimeRange {
        let from = (this.timestamp - this.minute * DateTime.MINUTE - this.second) >> 0;
        return {
            from: from,
            to: from + DateTime.HOUR - 1
        };
    }

    // 一天的起始
    dayRange(): DateTimeRange {
        let from = (this.timestamp - this.hour * DateTime.HOUR - this.minute * DateTime.MINUTE - this.second) >> 0;
        return {
            from: from,
            to: from + DateTime.DAY - 1
        };
    }

    // 本周的起始
    weekRange(): DateTimeRange {
        let from = (this.timestamp - this.weekday * DateTime.DAY - this.hour * DateTime.HOUR - this.minute * DateTime.MINUTE - this.second) >> 0;
        return {
            from: from,
            to: from + DateTime.WEEK - 1
        };
    }

    // 本月的起始
    monthRange(): DateTimeRange {
        let cur = Date.parse(this.hyear + "/" + this.hmonth);
        let next = new Date(cur).setMonth(this.month + 1);
        return {
            from: cur / 1000,
            to: next / 1000 - 1
        };
    }

    offset(day: number, hour: number = 0, minute: number = 0, second: number = 0): this {
        this.timestamp += day * DateTime.DAY + hour * DateTime.HOUR + minute * DateTime.MINUTE + second;
        return this;
    }

    offsetMonth(off: number): this {
        let cur = Date.parse(this.hyear + "/" + this.hmonth);
        this.timestamp = new Date(cur).setMonth(this.month + off) / 1000;
        return this;
    }

    debugDescription(): string {
        return "Datetime: GTZ:" + process.env.TZ + " TZ:" + TIMEZONE + " " + this.timestamp + " WD:" + this.weekday + " H:" + this.hour + " M:" + this.minute + " S:" + this.second;
    }

    clone(): DateTime {
        return new DateTime(this.timestamp);
    }

    static Pass(): number {
        return DateTime.Now() - __time_started;
    }
}

const __time_started = DateTime.Now();

let PROTO: any = Date.prototype;
PROTO.pattern = function (fmt: string) {
    var o: IndexedObject = {
        "M+": this.getMonth() + 1, //月份
        "d+": this.getDate(), //日
        "h+": this.getHours() % 12 == 0 ? 12 : this.getHours() % 12, //小时
        "H+": this.getHours(), //小时
        "m+": this.getMinutes(), //分
        "s+": this.getSeconds(), //秒
        "q+": Math.floor((this.getMonth() + 3) / 3), //季度
        "S": this.getMilliseconds() //毫秒
    };
    var week: IndexedObject = {
        "0": "/u65e5",
        "1": "/u4e00",
        "2": "/u4e8c",
        "3": "/u4e09",
        "4": "/u56db",
        "5": "/u4e94",
        "6": "/u516d"
    };
    if (/(y+)/.test(fmt)) {
        fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
    }
    if (/(E+)/.test(fmt)) {
        fmt = fmt.replace(RegExp.$1, ((RegExp.$1.length > 1) ? (RegExp.$1.length > 2 ? "/u661f/u671f" : "/u5468") : "") + week[this.getDay() + ""]);
    }
    for (var k in o) {
        if (new RegExp("(" + k + ")").test(fmt)) {
            fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
        }
    }
    return fmt;
}

export function Retry(cond: () => boolean, proc: () => void, interval = 1, delta = 2) {
    if (!cond()) {
        setTimeout(() => {
            Retry(cond, proc, interval + delta, delta);
        }, interval * 1000);
    }
    else {
        proc();
    }
}
