import {Crypto} from "./crypto";
import assert = require("assert");

function test_aes() {
    let key = '123456789abcdefg';
    let raw = '123abc一二三123abc一二三123abc一二三123abc一二三';
    let iv = '123456789abcdefg';
    let a = Crypto.Encrypt(key, raw, iv);
    console.log(a.toString('hex'));
    console.log(a.toString('base64'));
    let b = Crypto.Decrypt(key, a, iv);
    assert(b == raw);
}

function test_hmac() {
    let raw = 'fffffffffffffffffffffffffsadkjfsdkafjsdklafjsdakjfksadljfsadklfjdsalkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkfaljflasnkfn';
    let tgt = '44d9c22ce172dd28a2fde0ddaf92138219c354aef275b5c5ef22ba9ac0af06d1';
    let r = Crypto.Sign('abc', raw).toString('hex');
    assert(r == tgt);
}

export async function test_signal_protocol() {
    // Crypto.Test();
    await test_aes();
    await test_hmac();
}
