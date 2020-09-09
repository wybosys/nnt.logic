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

function test_digest() {
    let raw = 'fffffffffffffffffffffffffsadkjfsdkafjsdklafjsdakjfksadljfsadklfjdsalkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkfaljflasnkfn';
    let tgt = '44d9c22ce172dd28a2fde0ddaf92138219c354aef275b5c5ef22ba9ac0af06d1';
    let r = Crypto.Sign('abc', raw).toString('hex');
    assert(r == tgt);

    tgt = '210e229ca46aeff622d08f03743bcb304c585cfcbfba7ddb6a3703d920fa22876205f706acb237a4462f09ecc0374992862dedce5e065c51645c427502d7c16e';
    r = Crypto.Hash(raw).toString('hex');
    assert(r == tgt);
}

async function test_ecc() {
    let kp = Crypto.CreateKeyPair();
    console.log(kp);

    let sec = Crypto.ECDHE(kp.pubkey, kp.prvkey);
    console.log(sec);
}

export async function test_signal_protocol() {
    await Crypto.Test();
    await test_aes();
    await test_digest();
    await test_ecc();
}
