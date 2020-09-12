import {Crypto} from "../crypto";
import {FixedBuffer32} from "../../../../core/buffer";
import {KeyPair, X25519Key} from "../model";
import assert = require('assert');

function test_aes() {
    let key = '123456789abcdefg';
    let raw = '123abc一二三123abc一二三123abc一二三123abc一二三';
    let iv = '123456789abcdefg';
    let a = Crypto.Encrypt(key, Buffer.from(raw), iv);
    //console.log(a.toString('hex'));
    //console.log(a.toString('base64'));
    let b = Crypto.Decrypt(key, a, iv);
    //console.log(b.toString('utf8') == raw);
    assert(b.toString('utf8') == raw, "aes 加解密失败");
}

function test_digest() {
    let raw = 'fffffffffffffffffffffffffsadkjfsdkafjsdklafjsdakjfksadljfsadklfjdsalkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkfaljflasnkfn';
    let tgt = '44d9c22ce172dd28a2fde0ddaf92138219c354aef275b5c5ef22ba9ac0af06d1';
    let r = Crypto.Sign('abc', raw).toString('hex');
    assert(r == tgt);

    tgt = '210e229ca46aeff622d08f03743bcb304c585cfcbfba7ddb6a3703d920fa22876205f706acb237a4462f09ecc0374992862dedce5e065c51645c427502d7c16e';
    r = Crypto.Hash(raw).toString('hex');
    assert(r == tgt, "hash测试失败");
}

function test_ecc() {
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
    //console.log(kp);
    let sec = Crypto.ECDHE(kp, kp);
    //console.log(sec);

    let sig = Crypto.Ed25519Sign(kp, raw);
    let b = Crypto.Ed25519Verify(kp, raw, sig);
    // b = Crypto.Ed25519Verify(kp.pubKeyX, raw, sig);
    assert(b, "Ed25519签名验证失败");

    //let c = String.fromCharCode((3 << 4) | 3);
    //let res = String.fromCharCode((3 << 4) | 3) + raw.toString();
    //console.log(res);
}

function test_HKDF() {
    // HMAC RFC5869 Test vectors
    var T1 = Buffer.from("3cb25f25faacd57a90434f64d0362f2a2d2d0a90cf1a5a4c5db02d56ecc4c5bf", 'hex');
    var T2 = Buffer.from("34007208d5b887185865", 'hex');

    let IKM = Buffer.alloc(22, 11);

    var salt = new Uint8Array(new ArrayBuffer(13));
    for (var i = 0; i < 13; i++)
        salt[i] = i;

    var info = new Uint8Array(new ArrayBuffer(10));
    for (var i = 0; i < 10; i++)
        info[i] = 240 + i;

    let OKM = Crypto.HKDF(IKM, salt, Buffer.from(info));
    assert(OKM[0].buffer.compare(Buffer.from(T1)) == 0);
    assert(OKM[1].slice(0, 10).compare(Buffer.from(T2)) == 0);
}

function test_Curve25519() {
    var alice_bytes = Buffer.from("77076d0a7318a57d3c16c17251b26645df4c2f87ebc0992ab177fba51db92c2a", 'hex');
    var alice_priv = Buffer.from("77076d0a7318a57d3c16c17251b26645df4c2f87ebc0992ab177fba51db92c2a", 'hex');
    var alice_pub = Buffer.from("8520f0098930a754748b7ddcb43ef75a0dbf3a0d26381af4eba4a98eaa9b4e6a", 'hex');
    var bob_bytes = Buffer.from("5dab087e624a8a4b79e17f8b83800ee66f3bb1292618b6fd1c2f8b27ff88e0eb", 'hex');
    var bob_priv = Buffer.from("5dab087e624a8a4b79e17f8b83800ee66f3bb1292618b6fd1c2f8b27ff88e0eb", 'hex');
    var bob_pub = Buffer.from("de9edb7d7b7dc1b4d35b61c2ece435373f8343c85b78674dadfc7e146f882b4f", 'hex');
    var shared_sec = Buffer.from("4a5d9d5ba4ce2de1728e3bf480350f25e07e21c947d19e3376f09b3c1e161742", 'hex');

    // converts alice private keys to a keypair
    {
        let keypair = Crypto.CreateKeyPairX25519(new FixedBuffer32(alice_bytes));
        assert(keypair.privKeyX.isEqual(new X25519Key(alice_priv)));
        assert(keypair.pubKeyX.isEqual(new X25519Key(alice_pub)));
    }

    // converts bob private keys to a keypair
    {
        let keypair = Crypto.CreateKeyPairX25519(new FixedBuffer32(bob_bytes));
        assert(keypair.privKeyX.isEqual(new X25519Key(bob_priv)));
        assert(keypair.pubKeyX.isEqual(new X25519Key(bob_pub)));
    }

    // generates a key if one is not provided
    {
        let keypair = Crypto.CreateKeyPairX25519();
        assert(keypair.privKeyX.byteLength == 32);
        assert(keypair.pubKeyX.byteLength == 32);
    }

    // ECDHE
    {
        let bob = new KeyPair();
        bob.pubKeyX = new X25519Key(bob_pub);
        bob.privKeyX = new X25519Key(bob_priv);

        let alice = new KeyPair();
        alice.pubKeyX = new X25519Key(alice_pub);
        alice.privKeyX = new X25519Key(alice_priv);

        // computes the shared secret for alice"
        let secret1 = Crypto.ECDHE(bob, alice);
        // assert(shared_sec.compare(secret.buffer) == 0);

        // computes the shared secret for bob
        let secret2 = Crypto.ECDHE(alice, bob);
        // assert(shared_sec.compare(secret.buffer) == 0);

        assert(secret1.isEqual(secret2));

        bob = Crypto.CreateKeyPair();
        alice = Crypto.CreateKeyPair();

        let secret3 = Crypto.ECDHE(bob, alice);
        let secret4 = Crypto.ECDHE(alice, bob);
        assert(secret3.isEqual(secret4));
    }
}

export function test_crypto() {
    test_aes();
    test_digest();
    test_HKDF();
    test_Curve25519();
}
