import {Crypto} from "./crypto";
import assert = require("assert");

function test_aes() {
    let key = '123456789abcdefg';
    let raw = '123abc一二三123abc一二三123abc一二三123abc一二三';
    let iv = '123456789abcdefg';
    let a = Crypto.Encrypt(key, Buffer.from(raw), iv);
    console.log(a.toString('hex'));
    console.log(a.toString('base64'));
    let b = Crypto.Decrypt(key, a, iv);
    console.log(b.toString('utf8') == raw);
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
    let buf = Buffer.alloc(32, 0xff);
    console.log(buf);

    let tbuf = new Uint8Array(32);

    let t = buf instanceof Buffer;
    t = buf instanceof Uint8Array;
    t = tbuf instanceof Buffer;
    t = tbuf instanceof Uint8Array;

    let raw = Buffer.from("fdaf一二三");
    let yy = raw.toString();

    let kp = Crypto.CreateKeyPair();
    console.log(kp);

    let sec = Crypto.ECDHE(kp, kp);
    console.log(sec);

    let sig = Crypto.Ed25519Sign(kp, raw);
    let b = Crypto.Ed25519Verify(kp, raw, sig);
    // b = Crypto.Ed25519Verify(kp.pubKeyX, raw, sig);

    let c = String.fromCharCode((3 << 4) | 3);
    let res = String.fromCharCode((3 << 4) | 3) + raw.toString();
    console.log(res);
}

async function test_message() {

}

export async function test_signal_protocol() {
    await Crypto.Test();
    await test_aes();
    await test_digest();
    await test_ecc();
    await test_message();
}
