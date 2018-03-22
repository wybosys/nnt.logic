import {DateTime} from "./time";

export function probe(): (target: any, key: string, desp: PropertyDescriptor) => void {
    return (target: any, key: string, desp: PropertyDescriptor) => {
        if (typeof desp.value != "function")
            return;
        let old = desp.value;
        desp.value = (...args:any[])=>{
            let tm = DateTime.Now();
            old.apply(this, args);
            tm = DateTime.Now() - tm;
            console.log("消耗时间 " + tm);
        };
    };
}
