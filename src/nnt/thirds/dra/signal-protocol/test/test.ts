import {test_crypto} from "./test_crypto";
import {test_keyhelper} from "./test_keyhelper";
import {test_fingerprint} from "./test_fingerprint";
import {test_prekeystore} from "./test_prekeystore";
import {test_sessionbuilder} from "./test_sessionbuilder";
import {test_sessioncipher} from "./test_sessioncipher";

export async function test_signal_protocol() {
    test_crypto();
    test_keyhelper();
    test_fingerprint();
    test_prekeystore();
    test_sessioncipher();
    test_sessionbuilder();
}
