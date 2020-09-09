import {Crypto} from "./crypto";
import assert = require("assert");

function test_crypto() {
    let key = '123456789abcdefg';
    let raw = '123abc一二三';
    let iv = '123456789abcdefg';
    let a = Crypto.Encrypt(key, raw, iv);
    console.log(a.toString('binary'));
    console.log(a.toString('base64'));
    let b = Crypto.Decrypt(key, a, iv);
    assert(b == raw);
}

export function test_signal_protocol() {
    Crypto.Test();
    test_crypto();
}
