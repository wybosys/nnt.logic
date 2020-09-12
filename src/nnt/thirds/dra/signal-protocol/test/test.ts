import {test_crypto} from "./test_crypto";
import {test_keyhelper} from "./test_keyhelper";

export async function test_signal_protocol() {
    test_crypto();
    test_keyhelper();
}
