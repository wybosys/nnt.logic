import {SessionStorageMemory} from "../sessionstorage_memory";
import {Address} from "../address";
import {SessionCipher} from "../sessioncipher";
import {SessionRecord} from "../sessionrecord";
import {
    BaseKeyType,
    DecryptedMessage,
    KeyPair,
    MessageType,
    PreKey,
    Ratchet,
    Session,
    SessionIndexInfo,
    SignedPreKey
} from "../model";
import {use} from "../../../../core/kernel";
import {FixedBuffer32} from "../../../../core/buffer";
import {SessionStorage} from "../sessionstorage";
import {PushMessage, PushMessageFlag} from "../protocol";
import {SessionBuilder} from "../sessionbuilder";
import {generateIdentity, generatePreKeyBundle} from "./test_base";
import assert = require('assert');

async function getRemoteRegistrationId() {
    let store = new SessionStorageMemory();
    var registrationId = 1337;
    var address = new Address('foo', 1);
    var sessionCipher = new SessionCipher(store, address);

    // when an open record exists
    {
        let record = new SessionRecord();
        let session = new Session();
        session.registrationId = registrationId;
        session.currentRatchet = use(new Ratchet(), r => {
            r.rootKey = new FixedBuffer32();
            r.lastRemoteEphemeralKey = new KeyPair();
            r.previousCounter = 0
        });
        session.indexInfo = use(new SessionIndexInfo(), info => {
            info.baseKey = new KeyPair();
            info.baseKeyType = BaseKeyType.OURS;
            info.remoteIdentityKey = new KeyPair();
        });
        record.updateSessionState(session);
        await store.storeSession(address.toString(), record.serialize());

        // returns a valid registrationId
        {
            let value = await sessionCipher.getRemoteRegistrationId();
            assert(value == registrationId);
        }
    }

    // when a record does not exist'
    {
        // returns undefined
        {
            let sessionCipher = new SessionCipher(store, new Address('bar', 1));
            let value = await sessionCipher.getRemoteRegistrationId();
            assert(!value);
        }
    }
}

export async function hasOpenSession() {
    let store = new SessionStorageMemory();
    let address = new Address('foo', 1);
    let sessionCipher = new SessionCipher(store, address);

    // open session exists
    {
        let record = new SessionRecord();
        let session = new Session();
        session.registrationId = 1337;
        session.currentRatchet = use(new Ratchet(), r => {
            r.rootKey = new FixedBuffer32();
            r.lastRemoteEphemeralKey = new KeyPair();
            r.previousCounter = 0;
        });
        session.indexInfo = use(new SessionIndexInfo(), info => {
            info.baseKey = new KeyPair();
            info.baseKeyType = BaseKeyType.OURS;
            info.remoteIdentityKey = new KeyPair();
        });
        record.updateSessionState(session);
        await store.storeSession(address.toString(), record.serialize());

        // returns true
        {
            let value = sessionCipher.hasOpenSession(address.toString());
            assert(value);
        }
    }

    // no open session exists
    {
        let record = new SessionRecord();
        await store.storeSession(address.toString(), record.serialize());
    }

    // when there is no session
    {
        // returns false'
        {
            let value = sessionCipher.hasOpenSession('bar');
            assert(!value);
        }
    }
}

class Data {
    newEphemeralKey: KeyPair;
    ourIdentityKey: KeyPair;
    ourSignedPreKey: SignedPreKey;
    ourPreKey: PreKey;
    type: MessageType;
    expectTerminateSession: boolean;
    expectedSmsText: Buffer;
    message: Buffer;
    registrationId: number;
    ourBaseKey: KeyPair;
    ourEphemeralKey: KeyPair;
    getKeys: any;
    endSession: boolean;
    smsText: Buffer;
}

async function setupReceiveStep(store: SessionStorage, data: Data, privKeyQueue: KeyPair[]) {
    if (data.newEphemeralKey) {
        privKeyQueue.push(data.newEphemeralKey);
    }

    if (!data.ourIdentityKey) {
        return;
    }

    let keyPair = data.ourIdentityKey;
    await store.saveIdentity('', keyPair);

    let signedKeyPair = data.ourSignedPreKey;
    await store.storeSignedPreKey(data.ourSignedPreKey.keyId, signedKeyPair);

    if (data.ourPreKey) {
        let keyPair = data.ourPreKey;
        await store.storePreKey(data.ourPreKey.keyId, keyPair);
    }
}

function getPaddedMessageLength(messageLength: number): number {
    let messageLengthWithTerminator = messageLength + 1;
    let messagePartCount = Math.floor(messageLengthWithTerminator / 160);
    if (messageLengthWithTerminator % 160 !== 0) {
        messagePartCount++;
    }
    return messagePartCount * 160;
}

function pad(plaintext: Buffer): Buffer {
    let paddedPlaintext = new Buffer(
        getPaddedMessageLength(plaintext.byteLength + 1) - 1
    );
    paddedPlaintext.set(plaintext);
    paddedPlaintext[plaintext.byteLength] = 0x80;
    return paddedPlaintext;
}

function unpad(paddedPlaintext: DecryptedMessage): DecryptedMessage {
    let origin = new Buffer(paddedPlaintext.plaintext);
    let plaintext: Buffer;
    for (let i = origin.length - 1; i >= 0; i--) {
        if (origin[i] == 0x80) {
            plaintext = new Buffer(i);
            plaintext.set(origin.subarray(0, i));
            break;
        } else if (origin[i] !== 0x00) {
            throw new Error('Invalid padding');
        }
    }

    let r = new DecryptedMessage();
    r.plaintext = origin;
    return r;
}

async function doReceiveStep(store: SessionStorage, data: Data, privKeyQueue: KeyPair[], address: Address): Promise<boolean> {
    await setupReceiveStep(store, data, privKeyQueue);

    let sessionCipher = new SessionCipher(store, address);

    let plaintext: DecryptedMessage;
    if (data.type == MessageType.CIPHERTEXT) {
        plaintext = await sessionCipher.decryptWhisperMessage(data.message);
        unpad(plaintext);
    } else if (data.type == MessageType.PREKEY_BUNDLE) {
        plaintext = await sessionCipher.decryptPreKeyWhisperMessage(data.message);
        unpad(plaintext);
    } else {
        throw new Error("Unknown data type in test vector");
    }

    let content = new PushMessage().serialin(plaintext.plaintext);
    if (data.expectTerminateSession) {
        return content.flag == PushMessageFlag.END_SESSION;
    }

    return content.body.compare(data.expectedSmsText) == 0;
}

async function setupSendStep(store: SessionStorage, data: Data, privKeyQueue: KeyPair[]) {
    if (data.registrationId) {
        await store.storeLocalRegistrationId(data.registrationId);
    }
    if (data.ourBaseKey) {
        privKeyQueue.push(data.ourBaseKey);
    }
    if (data.ourEphemeralKey) {
        privKeyQueue.push(data.ourEphemeralKey);
    }

    if (data.ourIdentityKey) {
        let keyPair = data.ourIdentityKey;
        await store.saveIdentity('', keyPair);
    }
}

async function doSendStep(store: SessionStorage, data: Data, privKeyQueue: KeyPair[], address: Address) {
    await setupSendStep(store, data, privKeyQueue);
    if (data.getKeys) {
        var deviceObject = {
            encodedNumber: address.toString(),
            identityKey: data.getKeys.identityKey,
            preKey: data.getKeys.devices[0].preKey,
            signedPreKey: data.getKeys.devices[0].signedPreKey,
            registrationId: data.getKeys.devices[0].registrationId
        };

        var builder = new SessionBuilder(store, address);
        return builder.processPreKey(deviceObject);
    }

    let proto = new PushMessage();
    if (data.endSession) {
        proto.flag = PushMessageFlag.END_SESSION;
    } else {
        proto.body = data.smsText;
    }

    let sessionCipher = new SessionCipher(store, address);
    let msg = await sessionCipher.encrypt(pad(proto));

    let res: boolean;
    //XXX: This should be all we do: isEqual(data.expectedCiphertext, encryptedMsg, false);
    if (msg.type == 1) {
        res = util.isEqual(data.expectedCiphertext, msg.body);
    } else {
        if (new Uint8Array(data.expectedCiphertext)[0] !== msg.body.charCodeAt(0)) {
            throw new Error("Bad version byte");
        }

        var expected = Internal.protobuf.PreKeyWhisperMessage.decode(
            data.expectedCiphertext.slice(1)
        ).encode();

        if (!util.isEqual(expected, msg.body.substring(1))) {
            throw new Error("Result does not match expected ciphertext");
        }

        res = true;
    }

    if (data.endSession) {
        await sessionCipher.closeOpenSessionForDevice();
    }

    return res;
}

function getDescription(step) {
    var direction = step[0];
    var data = step[1];
    if (direction === "receiveMessage") {
        if (data.expectTerminateSession) {
            return 'receive end session message';
        } else if (data.type === 3) {
            return 'receive prekey message ' + data.expectedSmsText;
        } else {
            return 'receive message ' + data.expectedSmsText;
        }
    } else if (direction === "sendMessage") {
        if (data.endSession) {
            return 'send end session message';
        } else if (data.ourIdentityKey) {
            return 'send prekey message ' + data.smsText;
        } else {
            return 'send message ' + data.smsText;
        }
    }
}

async function KeyChanges() {
    let ALICE_ADDRESS = new Address("+14151111111", 1);
    let BOB_ADDRESS = new Address("+14152222222", 1);
    let originalMessage = Buffer.from("L'homme est condamné à être libre");
    let aliceStore = new SessionStorageMemory();
    let bobStore = new SessionStorageMemory();
    let bobPreKeyId = 1337;
    let bobSignedKeyId = 1;
    let bobSessionCipher = new SessionCipher(bobStore, ALICE_ADDRESS);

    await generateIdentity(bobStore);
    await generateIdentity(aliceStore);

    let preKeyBundle = await generatePreKeyBundle(bobStore, bobPreKeyId, bobSignedKeyId);
    let builder = new SessionBuilder(aliceStore, BOB_ADDRESS);
    await builder.processPreKey(preKeyBundle);
    let aliceSessionCipher = new SessionCipher(aliceStore, BOB_ADDRESS);
    let ciphertext = await aliceSessionCipher.encrypt(originalMessage);
    await bobSessionCipher.decryptPreKeyWhisperMessage(ciphertext.body);

    // When bob's identity changes
    {
        let ciphertext = await bobSessionCipher.encrypt(originalMessage);
        await generateIdentity(bobStore);
        await aliceStore.saveIdentity(BOB_ADDRESS.toString(), await bobStore.getIdentityKeyPair());

        // alice cannot encrypt with the old session
        {
            let aliceSessionCipher = new SessionCipher(aliceStore, BOB_ADDRESS);
            try {
                await aliceSessionCipher.encrypt(originalMessage);
            } catch (e) {
                assert(e.message == 'Identity key changed');
            }
        }

        // alice cannot decrypt from the old session
        {
            let aliceSessionCipher = new SessionCipher(aliceStore, BOB_ADDRESS);
            try {
                await aliceSessionCipher.decryptWhisperMessage(ciphertext.body);
            } catch (e) {
                assert(e.message == 'Identity key changed');
            }
        }
    }
}

export async function test_sessioncipher() {
    await getRemoteRegistrationId();
    await hasOpenSession();
    await KeyChanges();
}