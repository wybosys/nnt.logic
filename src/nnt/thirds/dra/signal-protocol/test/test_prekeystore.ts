import assert = require('assert');
import {KeyPair} from "../model";
import {Crypto} from "../crypto";
import {Address} from "../address";
import {SessionStorage} from "../sessionstorage";
import {SessionStorageMemory} from "../sessionstorage_memory";

var number = '+5558675309';
var testKey: KeyPair;
let store: SessionStorage;

function PreKeyStore() {
    testKey = Crypto.CreateKeyPair();
}

async function storePreKey() {
    var address = new Address(number, 1);
    await store.storePreKey(address.hash, testKey);
    let key = await store.loadPreKey(address.hash);
    assert(key.isEqual(testKey));
}

async function loadPreKey() {
    // returns prekeys that exist'
    {
        let address = new Address(number, 1);
        await store.storePreKey(address.hash, testKey);
        let key = await store.loadPreKey(address.hash);
        assert(key.isEqual(testKey));
    }

    // returns undefined for prekeys that do not exist
    {
        let address = new Address(number, 2);
        let key = await store.loadPreKey(2);
        assert(!key);
    }
}

async function removePreKey() {
    let address = new Address(number, 2);
    await store.storePreKey(address.hash, testKey);
    await store.removePreKey(address.hash);
    let key = await store.loadPreKey(address.hash);
    assert(!key);
}

export async function test_prekeystore() {
    store = new SessionStorageMemory();

    await PreKeyStore();
    await storePreKey();
    await loadPreKey();
    await removePreKey();
}