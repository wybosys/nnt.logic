export module configs {

type unknown = string;
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
        //按钮1
        get button1():number { return this.cfg[3]; } 
        //按钮2
        get button2():number { return this.cfg[4]; } 
        //按钮3
        get button3():number { return this.cfg[5]; } 
        //按钮4
        get button4():number { return this.cfg[6]; } 
        
        static INDEX_ID = 0;
        static INDEX_LOW_GOLD = 1;
        static INDEX_HIGH_GOLD = 2;
        static INDEX_BUTTON1 = 3;
        static INDEX_BUTTON2 = 4;
        static INDEX_BUTTON3 = 5;
        static INDEX_BUTTON4 = 6;
        
        
        static Get(key:number):Bet_button_role {return key in _bet_button_roleMap ? new Bet_button_role(_bet_button_roleMap[key]) : null;}
        constructor(d:any) { this.cfg = d; }
        cfg:any;
    }


    export const bet_button_roles:Array<any> = [
        [0,0,100000,100,200,500,1000],[1,100000,2000000,100,500,1000,2000],[2,2000000,20000000,100,1000,10000,100000],[3,20000000,-1,100,10000,100000,200000],[0,0,0,0,0,0,0]
        ];


        t = bet_button_roles;
        let _bet_button_roleMap:any = {
        0:t[0],1:t[1],2:t[2],3:t[3],4:t[4]
        };


}
