import {IndexedObject, toJson, toJsonObject, use} from "../../../core/kernel";
import {KeyPair} from "./model";
import {IPodObject} from "../../../core/object";
import {FixedBuffer32} from "../../../core/buffer";

export abstract class Protocol implements IPodObject {

    serialout = (): Buffer => {
        return Buffer.from(toJson(this.toPod()), 'utf8');
    }

    serialin = (data: Buffer): boolean => {
        let o = toJsonObject(data.toString('utf8'));
        if (!o)
            return false;
        this.fromPod(o);
        return true;
    }

    abstract toPod(): IndexedObject;

    abstract fromPod(obj: IndexedObject): boolean;
}

export class WhisperMessage extends Protocol {
    ephemeralKey: KeyPair;
    counter: number;
    previousCounter: number;
    ciphertext: Buffer;

    toPod(): IndexedObject {
        return {
            ephemeralKey: this.ephemeralKey.toPod(),
            counter: this.counter,
            previousCounter: this.previousCounter,
            ciphertext: this.ciphertext.toString('base64')
        };
    }

    fromPod(obj: IndexedObject): boolean {
        this.ephemeralKey = use(new KeyPair(), kp => {
            kp.fromPod(obj.ephemeralKey);
        });
        this.counter = obj.counter;
        this.previousCounter = obj.previousCounter;
        this.ciphertext = Buffer.from(obj.ciphertext, 'base64');
        return true;
    }
}

export class PreKeyWhisperMessage extends Protocol {
    registrationId: number;
    preKeyId: number;
    signedPreKeyId: number;
    baseKey: KeyPair;
    identityKey: KeyPair;
    message: Buffer;

    toPod(): IndexedObject {
        return {
            registrationId: this.registrationId,
            preKeyId: this.preKeyId,
            signedPreKeyId: this.signedPreKeyId,
            baseKey: this.baseKey.toPod(),
            identityKey: this.identityKey.toPod(),
            message: this.message.toString('base64')
        };
    }

    fromPod(obj: IndexedObject): boolean {
        this.registrationId = obj.registrationId;
        this.preKeyId = obj.preKeyId;
        this.signedPreKeyId = obj.signedPreKeyId;
        this.baseKey = use(new KeyPair(), kp => {
            kp.fromPod(obj.baseKey);
        });
        this.identityKey = use(new KeyPair(), kp => {
            kp.fromPod(obj.identityKey);
        });
        this.message = Buffer.from(obj.message, 'base64');
        return true;
    }
}

export class KeyExchangeMessage extends Protocol {
    id: number;
    baseKey: KeyPair;
    ephemeralKey: KeyPair;
    identityKey: KeyPair;
    baseKeySignature: FixedBuffer32;

    toPod(): IndexedObject {
        return {
            id: this.id,
            baseKey: this.baseKey.toPod(),
            ephemeralKey: this.ephemeralKey.toPod(),
            identityKey: this.identityKey.toPod(),
            baseKeySignature: this.baseKeySignature.serialize()
        };
    }

    fromPod(obj: IndexedObject): boolean {
        this.id = obj.id;
        this.baseKey = use(new KeyPair(), kp => {
            kp.fromPod(obj.baseKey);
        });
        this.ephemeralKey = use(new KeyPair(), kp => {
            kp.fromPod(obj.ephemeralKey);
        });
        this.identityKey = use(new KeyPair(), kp => {
            kp.fromPod(obj.identityKey);
        });
        this.baseKeySignature = use(new FixedBuffer32(), buf => {
            buf.unserialize(obj.baseKeySignature);
        });
        return true;
    }
}

