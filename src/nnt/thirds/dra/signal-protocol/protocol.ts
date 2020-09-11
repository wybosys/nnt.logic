import {IndexedObject, toJson, toJsonObject} from "../../../core/kernel";
import {X25519Key} from "./model";

export class Protocol {

    serialout = (): Buffer => {
        return Buffer.from(toJson(this), 'utf8');
    }

    serialin = (data: Buffer): boolean => {
        let o = toJsonObject(data.toString('utf8'));
        if (!o)
            return false;
        for (let k in o) {
            (<IndexedObject>this)[k] = o;
        }
        return true;
    }
}

export class WhisperMessage extends Protocol {
    ephemeralKey: X25519Key;
    counter: number;
    previousCounter: number;
    ciphertext: Buffer;
}

export class PreKeyWhisperMessage extends Protocol {
    registrationId: number;
    preKeyId: number;
    signedPreKeyId: number;
    baseKey: X25519Key;
    identityKey: X25519Key;
    message: Buffer;
}

export class KeyExchangeMessage extends Protocol {
    id: number;
    baseKey: Uint8Array;
    ephemeralKey: Uint8Array;
    identityKey: Uint8Array;
    baseKeySignature: Uint8Array;
}

