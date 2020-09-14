// 常用的账号相关的处理方法
import crypto = require("crypto");
import {DateTime} from "../core/time";
import {IsDebug} from "../manager/config";
import {ArrayT} from "../core/arrayt";
import {Random} from "../core/random";

// 生成SID
export function GEN_SID(): string {
    return crypto.createHash('md5').update(Math.random().toString()).digest('hex');
}

// 生成匿名账号
export function GEN_ANNY(): string {
    return crypto.createHash('md5').update(Math.random().toString()).digest('hex');
}

const CODE_ARR = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"];

// 生成验证码
// 流程：服务端把result发给客户端，并通过短信或其他方式把code发给客户端，客户端通过在需要验证的接口发送result和用户填入的code来完成验证，验证码统一有效期为1分钟
export class VerifyCode {
    static SUPER = "8888";

    // 验证串
    result: string;

    // 验证码
    code: string;

    // 获得一组新的
    static Gen(len: number = 4): VerifyCode {
        let now = DateTime.Now();
        if (now - codephrasetm >= CODEPHRASE_EXPIRE)
            codephrase = GenCodePhrase();
        codephrasetm = now;
        let r = new VerifyCode();
        r.code = "";
        while (len--)
            r.code += ArrayT.Random(CODE_ARR);
        let h = crypto.createCipher("aes-128-ecb", r.code);
        h.update(codephrase, "utf8");
        r.result = h.final("base64");
        return r;
    }

    static Verify(result: string, code: string): boolean {
        if (!(!IsDebug() && code == VerifyCode.SUPER)) {
            let h = crypto.createCipher("aes-128-ecb", code);
            h.update(codephrase, "utf8");
            return h.final("base64") == result;
        }
        return true;
    }
}

function GenCodePhrase(): string {
    return Random.Rangei(0, 0xffff).toString();
}

const CODEPHRASE_EXPIRE = 60;

// 当前验证码的刷新间隔
let codephrasetm = DateTime.Now();
let codephrase = GenCodePhrase();