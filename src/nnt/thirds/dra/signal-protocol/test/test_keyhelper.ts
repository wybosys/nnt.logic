import {KeyPair} from "../model";
import {KeyHelper} from "../keyhelper";
import assert = require('assert');

function validateKeyPair(keyPair: KeyPair) {
    assert(keyPair.pubKeyEd);
    assert(keyPair.privKeyEd);
    assert(keyPair.privKeyEd.byteLength == 64);
    assert(keyPair.pubKeyEd.byteLength == 32);
}

function generateIdentityKeyPair() {
    let kp = KeyHelper.GenerateIdentityKeyPair();
    validateKeyPair(kp);
}

function generateRegistrationId() {
    let registrationId = KeyHelper.GenerateRegistrationId();
    assert(typeof registrationId == 'number');
    assert(registrationId >= 0);
    assert(registrationId < 16384);
    assert(registrationId == Math.round(registrationId)); // integer
}

function generatePreKey() {
    let result = KeyHelper.GeneratePreKey(1337);
    validateKeyPair(result);
    assert(result.keyId == 1337);
}

function generateSignedPreKey() {
    let identityKey = KeyHelper.GenerateIdentityKeyPair();
    let result = KeyHelper.GenerateSignedPreKey(identityKey, 1337);
    validateKeyPair(result);
    assert(result.keyId == 1337);
}

export function test_keyhelper() {
    generateIdentityKeyPair();
    generateRegistrationId();
    generatePreKey();
    generateSignedPreKey();
}