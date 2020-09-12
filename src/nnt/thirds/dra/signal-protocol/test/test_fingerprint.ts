import {FingerprintGenerator} from "../numberfingerprint";
import {X25519Key} from "../model";
import {Crypto} from "../crypto";
import assert = require('assert');

let ALICE_IDENTITY = [
    0x06, 0x86, 0x3b, 0xc6, 0x6d, 0x02, 0xb4, 0x0d, 0x27, 0xb8, 0xd4,
    0x9c, 0xa7, 0xc0, 0x9e, 0x92, 0x39, 0x23, 0x6f, 0x9d, 0x7d, 0x25, 0xd6,
    0xfc, 0xca, 0x5c, 0xe1, 0x3c, 0x70, 0x64, 0xd8, 0x68
];
let BOB_IDENTITY = [
    0xf7, 0x81, 0xb6, 0xfb, 0x32, 0xfe, 0xd9, 0xba, 0x1c, 0xf2, 0xde,
    0x97, 0x8d, 0x4d, 0x5d, 0xa2, 0x8d, 0xc3, 0x40, 0x46, 0xae, 0x81, 0x44,
    0x02, 0xb5, 0xc0, 0xdb, 0xd9, 0x6f, 0xda, 0x90, 0x7b
];
let FINGERPRINT = "059142880471735069831131731564940027731022934467570443017412";

function NumericFingerprint() {
    let alice = {
        identifier: '+14152222222',
        key: new X25519Key(Buffer.from(ALICE_IDENTITY))
    };
    let bob = {
        identifier: '+14153333333',
        key: new X25519Key(Buffer.from(BOB_IDENTITY))
    };

    // returns the correct fingerprint
    {
        let generator = new FingerprintGenerator(5200);
        let fingerprint = generator.createFor(
            alice.identifier, alice.key, bob.identifier, bob.key
        );
        assert(fingerprint == FINGERPRINT);
    }

    // alice and bob results match
    {
        let generator = new FingerprintGenerator(1024);
        let afp = generator.createFor(
            alice.identifier, alice.key, bob.identifier, bob.key
        );
        let bfp = generator.createFor(
            bob.identifier, bob.key, alice.identifier, alice.key
        );
        assert(afp == bfp);
    }

    // alice and !bob results mismatch
    {
        let generator = new FingerprintGenerator(1024);
        let afp = generator.createFor(
            alice.identifier, alice.key, '+15558675309', bob.key
        );
        let bfp = generator.createFor(
            bob.identifier, bob.key, alice.identifier, alice.key
        );
        assert(afp != bfp);
    }

    // alice and mitm results mismatch
    {
        let mitm = new X25519Key(Crypto.GetRandomBytes(32));
        let generator = new FingerprintGenerator(1024);
        let afp = generator.createFor(
            alice.identifier, alice.key, bob.identifier, mitm
        );
        let bfp = generator.createFor(
            bob.identifier, bob.key, alice.identifier, alice.key
        );
        assert(afp != bfp);
    }
}

export function test_fingerprint() {
    NumericFingerprint();
}
