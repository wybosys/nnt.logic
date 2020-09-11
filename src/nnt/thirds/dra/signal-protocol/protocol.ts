import {IndexedObject, toJson, toJsonObject} from "../../../core/kernel";
import {FixedBuffer32} from "../../../core/buffer";

export class Protocol {
    serialout = (): string => {
        return toJson(this);
    }

    serialin = (data: string): boolean => {
        let o = toJsonObject(data);
        if (!o)
            return false;
        for (let k in o) {
            (<IndexedObject>this)[k] = o;
        }
        return true;
    }
}

export class WhisperMessage extends Protocol {
    ephemeralKey: Uint8Array;
    counter: number;
    previousCounter: number;
    ciphertext: Uint8Array;
}

export class PreKeyWhisperMessage extends Protocol {
    registrationId: number;
    preKeyId: number;
    signedPreKeyId: number;
    baseKey: Uint8Array;
    identityKey: FixedBuffer32;
    message: Uint8Array;
}

export class KeyExchangeMessage extends Protocol {
    id: number;
    baseKey: Uint8Array;
    ephemeralKey: Uint8Array;
    identityKey: Uint8Array;
    baseKeySignature: Uint8Array;
}

