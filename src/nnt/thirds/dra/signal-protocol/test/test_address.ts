import {Address} from "../address";
import assert = require('assert');

export function test_address() {
    var name = 'name';
    var deviceId = 42;
    var string = 'name.42';

    // getName
    {
        let address = new Address(name, 1);
        assert(name, address.name);
    }

    // getDeviceId
    {
        let address = new Address(name, deviceId);
        assert(deviceId == address.deviceId);
    }

    // toString
    {
        let address = new Address(name, deviceId);
        assert(string == address.toString());
    }

    // fromString
    {
        let address = Address.FromString(string);
        assert(deviceId == address.deviceId);
        assert(name == address.name);
    }
}