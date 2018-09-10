export module configs {

type undecl = string;
type rowindex = number;
let t:any;

interface pair <K, V> {k:K;v:V;}


    export class Bet_button_role {
        //ID
        get id():number { return this.cfg[0]; } 
        //金币量下限
        get low_gold():number { return this.cfg[1]; } 
        //金币量上限
        get high_gold():number { return this.cfg[2]; } 
        //JSON数据
        get json():any { return this.cfg[3]; } 
        
        static INDEX_ID = 0;
        static INDEX_LOW_GOLD = 1;
        static INDEX_HIGH_GOLD = 2;
        static INDEX_JSON = 3;
        
        static ONE = 0;
        static TWO = 1;
        static THREE = 2;
        static FOUR = 3;
        
        static Get(key:number):Bet_button_role {return key in _bet_button_roleMap ? new Bet_button_role(_bet_button_roleMap[key]) : null;}
        constructor(d:any) { this.cfg = d; }
        cfg:any;
    }


    export const bet_button_roles:Array<any> = [
        [0,0,100000,{"test":"abc"}],[1,100000,2000000,null],[2,2000000,20000000,null],[3,20000000,-1,null]
        ];


        t = bet_button_roles;
        let _bet_button_roleMap:any = {
        0:t[0],1:t[1],2:t[2],3:t[3]
        };


}
