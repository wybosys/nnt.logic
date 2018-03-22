// 为了减少newDate获取当前时间的消耗，使用计划任务每天更新一次

import {AbstractCronTask, CronAdd, PerDay, PerHour} from "../manager/crons";
import {DateTime, DateTimeRange} from "../core/time";

class _TaskToday extends AbstractCronTask {

    main() {
        let now = new DateTime();
        TODAY_RANGE = now.dayRange();
        TODAY_YEAR = now.hyear;
        TODAY_MONTH = now.hmonth;
        TODAY_DAY = now.hday;
    }
}

let _td = new _TaskToday();
_td.main();
CronAdd(PerDay(1), _td, false);

export let TODAY_RANGE: DateTimeRange;
export let TODAY_DAY: number;
export let TODAY_MONTH: number;
export let TODAY_YEAR: number;

class _TaskHour extends AbstractCronTask {

    main() {
        let now = new DateTime();
        CURRENT_HOUR_RANGE = now.hourRange();
    }
}

let _th = new _TaskHour();
_th.main();
CronAdd(PerHour(1), _th, false);

export let CURRENT_HOUR_RANGE: DateTimeRange;