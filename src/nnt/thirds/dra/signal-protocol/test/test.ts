import {test_crypto} from "./test_crypto";
import {test_keyhelper} from "./test_keyhelper";
import {test_fingerprint} from "./test_fingerprint";

export async function test_signal_protocol() {
    test_crypto();
    test_keyhelper();
    test_fingerprint();
}
