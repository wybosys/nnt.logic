// 为了减少newDate获取当前时间的消耗，使用计划任务每天更新一次

import {CronTask, PerDay, PerHour} from "../manager/crons";
import {DateTime, DateTimeRange} from "../core/time";

class _TaskToday extends CronTask {

    main() {
        let now = new DateTime();
        TODAY_RANGE = now.dayRange();
        WEEKEND_RANGE = now.weekRange();
        TODAY_YEAR = now.hyear;
        TODAY_MONTH = now.hmonth;
        TODAY_DAY = now.hday;
    }
}

let _td = new _TaskToday();
_td.time = PerDay(1);
_td.main();
_td.start();

export let TODAY_RANGE: DateTimeRange;
export let WEEKEND_RANGE: DateTimeRange
export let TODAY_DAY: number;
export let TODAY_MONTH: number;
export let TODAY_YEAR: number;

class _TaskHour extends CronTask {

    main() {
        let now = new DateTime();
        CURRENT_HOUR_RANGE = now.hourRange();
    }
}

let _th = new _TaskHour();
_th.time = PerHour(1);
_th.main();
_th.start();

export let CURRENT_HOUR_RANGE: DateTimeRange;