import {Address} from "../address";
import {SessionStorageMemory} from "../sessionstorage_memory";
import {generateIdentity, generatePreKeyBundle} from "./test_base";
import {SessionBuilder} from "../sessionbuilder";
import {SessionCipher} from "../sessioncipher";
import {SessionRecord} from "../sessionrecord";
import {KeyHelper} from "../keyhelper";
import {Device} from "../model";
import assert = require('assert');

async function TestSessionBuilder() {
    var ALICE_ADDRESS = new Address("+14151111111", 1);
    var BOB_ADDRESS = new Address("+14152222222", 1);

    // basic prekey v3
    {
        let aliceStore = new SessionStorageMemory();
        let bobStore = new SessionStorageMemory();
        let bobPreKeyId = 1337;
        let bobSignedKeyId = 1;

        await generateIdentity(aliceStore);
        await generateIdentity(bobStore);

        let preKeyBundle = await generatePreKeyBundle(bobStore, bobPreKeyId, bobSignedKeyId);
        let builder = new SessionBuilder(aliceStore, BOB_ADDRESS);
        await builder.processPreKey(preKeyBundle);

        let originalMessage = Buffer.from("L'homme est condamné à être libre");
        let aliceSessionCipher = new SessionCipher(aliceStore, BOB_ADDRESS);
        let bobSessionCipher = new SessionCipher(bobStore, ALICE_ADDRESS);

        // creates a session
        {
            let record = await aliceStore.loadSession(BOB_ADDRESS.toString());
            assert(record);
            let sessionRecord = SessionRecord.Deserialize(record);
            assert(sessionRecord.haveOpenSession());
            assert(sessionRecord.getOpenSession());
        }

        // the session can encrypt
        {
            let ciphertext = await aliceSessionCipher.encrypt(originalMessage);
            assert(ciphertext.type == 3); // PREKEY_BUNDLE
            let plaintext = await bobSessionCipher.decryptPreKeyWhisperMessage(ciphertext.body);
            assert(plaintext.plaintext.compare(originalMessage) == 0);
        }

        // the session can decrypt
        {
            let ciphertext = await bobSessionCipher.encrypt(originalMessage);
            let plaintext = await aliceSessionCipher.decryptWhisperMessage(ciphertext.body);
            assert(plaintext.plaintext.compare(originalMessage) == 0);
        }

        // accepts a new preKey with the same identity'
        {
            let preKeyBundle = await generatePreKeyBundle(bobStore, bobPreKeyId + 1, bobSignedKeyId + 1);
            let builder = new SessionBuilder(aliceStore, BOB_ADDRESS);
            await builder.processPreKey(preKeyBundle);
            let record = await aliceStore.loadSession(BOB_ADDRESS.toString());
            assert(record);
            let sessionRecord = SessionRecord.Deserialize(record);
            assert(sessionRecord.haveOpenSession());
            assert(sessionRecord.getOpenSession());
        }

        // rejects untrusted identity keys
        {
            let newIdentity = KeyHelper.GenerateIdentityKeyPair();
            let builder = new SessionBuilder(aliceStore, BOB_ADDRESS);
            let device = new Device();
            device.identityKey = newIdentity;
            device.registrationId = 12356;
            try {
                await builder.processPreKey(device);
                assert(false); // 错误解码
            } catch (e) {
                assert(true); // 爆出异常才是正确的流程
            }
        }
    }

    // basic v3 NO PREKEY
    {
        let aliceStore = new SessionStorageMemory();
        let bobStore = new SessionStorageMemory();
        let bobPreKeyId = 1337;
        let bobSignedKeyId = 1;

        await generateIdentity(aliceStore);
        await generateIdentity(bobStore);

        let preKeyBundle = await generatePreKeyBundle(bobStore, bobPreKeyId, bobSignedKeyId);
        preKeyBundle.preKey = null;
        let builder = new SessionBuilder(aliceStore, BOB_ADDRESS);
        await builder.processPreKey(preKeyBundle);

        let originalMessage = Buffer.from("L'homme est condamné à être libre");
        let aliceSessionCipher = new SessionCipher(aliceStore, BOB_ADDRESS);
        let bobSessionCipher = new SessionCipher(bobStore, ALICE_ADDRESS);

        // creates a session
        {
            let record = await aliceStore.loadSession(BOB_ADDRESS.toString());
            assert(record);
            let sessionRecord = SessionRecord.Deserialize(record);
            assert(sessionRecord.haveOpenSession());
            assert(sessionRecord.getOpenSession());
        }

        // the session can encrypt
        {
            let ciphertext = await aliceSessionCipher.encrypt(originalMessage);
            assert(ciphertext.type == 3); // PREKEY_BUNDLE
            let plaintext = await bobSessionCipher.decryptPreKeyWhisperMessage(ciphertext.body);
            assert(plaintext.plaintext.compare(originalMessage) == 0);
        }

        // the session can decrypt
        {
            let ciphertext = await bobSessionCipher.encrypt(originalMessage);
            let plaintext = await aliceSessionCipher.decryptWhisperMessage(ciphertext.body);
            assert(plaintext.plaintext.compare(originalMessage) == 0);
        }

        // accepts a new preKey with the same identity
        {
            let preKeyBundle = await generatePreKeyBundle(bobStore, bobPreKeyId + 1, bobSignedKeyId + 1);
            preKeyBundle.preKey = null;
            let builder = new SessionBuilder(aliceStore, BOB_ADDRESS);
            await builder.processPreKey(preKeyBundle);
            let record = await aliceStore.loadSession(BOB_ADDRESS.toString());
            assert(record);
            let sessionRecord = SessionRecord.Deserialize(record);
            assert(sessionRecord.haveOpenSession());
            assert(sessionRecord.getOpenSession());
        }

        // rejects untrusted identity keys
        {
            let newIdentity = KeyHelper.GenerateIdentityKeyPair();
            let builder = new SessionBuilder(aliceStore, BOB_ADDRESS);
            try {
                let device = new Device();
                device.identityKey = newIdentity;
                device.registrationId = 12356;
                await builder.processPreKey(device);
                assert(false);
            } catch (e) {
                assert(true);
            }
        }
    }
}

export async function test_sessionbuilder() {
    await TestSessionBuilder();
}