import {IndexedObject} from "../../../core/kernel";
import {KeyPair} from "./model";
import {IPodObject, ISerializableObject} from "../../../core/object";
import {FixedBuffer32, StreamBuffer, TYPEBYTES} from "../../../core/buffer";
import {toJson, toJsonObject} from "../../../core/json";

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

// 发送的消息

export enum MessageType {
    PLAINTEXT = 0,
    END_SESSION = 1,
    CIPHERTEXT = 2,
    PREKEY_BUNDLE = 3,
}

export class Message extends Protocol implements ISerializableObject {

    type: MessageType;
    body: Buffer;

    toPod(): IndexedObject {
        return {
            type: this.type,
            body: this.body.toString('base64')
        };
    }

    fromPod(obj: IndexedObject): this {
        this.type = obj.type;
        this.body = Buffer.from(obj.body, 'base64');
        return this;
    }

    serialize(): Buffer {
        let r = StreamBuffer.Alloc(TYPEBYTES.INT32 + TYPEBYTES.INT32 + this.body.byteLength);
        r.writeInt32BE(this.type);
        r.writeInt32BE(this.body.byteLength);
        r.writeBuffer(this.body);
        return r.buffer;
    }

    unserialize(buf: Buffer): this {
        let stm = StreamBuffer.From(buf);
        this.type = stm.readInt32BE();
        let size = stm.readInt32BE();
        this.body = stm.readBuffer(size);
        return this;
    }

}