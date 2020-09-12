import {IndexedObject, toJson, toJsonObject} from "../../../core/kernel";
import {KeyPair} from "./model";
import {IPodObject} from "../../../core/object";
import {FixedBuffer32} from "../../../core/buffer";

export abstract class Protocol implements IPodObject {

    serialout = (): Buffer => {
        return Buffer.from(toJson(this.toPod()), 'utf8');
    }

    serialin = (data: Buffer): this => {
        let o = toJsonObject(data.toString('utf8'));
        if (!o)
            return null;
        this.fromPod(o);
        return this;
    }

    abstract toPod(): IndexedObject;

    abstract fromPod(obj: IndexedObject): this;
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

    fromPod(obj: IndexedObject): this {
        this.ephemeralKey = new KeyPair().fromPod(obj.ephemeralKey);
        this.counter = obj.counter;
        this.previousCounter = obj.previousCounter;
        this.ciphertext = Buffer.from(obj.ciphertext, 'base64');
        return this;
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

    fromPod(obj: IndexedObject): this {
        this.registrationId = obj.registrationId;
        this.preKeyId = obj.preKeyId;
        this.signedPreKeyId = obj.signedPreKeyId;
        this.baseKey = new KeyPair().fromPod(obj.baseKey);
        this.identityKey = new KeyPair().fromPod(obj.identityKey);
        this.message = Buffer.from(obj.message, 'base64');
        return this;
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

    fromPod(obj: IndexedObject): this {
        this.id = obj.id;
        this.baseKey = new KeyPair().fromPod(obj.baseKey);
        this.ephemeralKey = new KeyPair().fromPod(obj.ephemeralKey);
        this.identityKey = new KeyPair().fromPod(obj.identityKey);
        this.baseKeySignature = new FixedBuffer32().unserialize(obj.baseKeySignature);
        return this;
    }
}

export enum PushMessageFlag {
    END_SESSION = 1
}

export class PushMessage extends Protocol {

    flag: PushMessageFlag;
    body: Buffer;

    toPod(): IndexedObject {
        return {
            flag: this.flag,
            body: this.body.toString('base64')
        };
    }

    fromPod(obj: IndexedObject): this {
        this.flag = obj.flag;
        this.body = Buffer.from(obj.body, 'base64');
        return this;
    }
}