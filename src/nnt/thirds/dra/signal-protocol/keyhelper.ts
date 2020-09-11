import {Crypto} from "./crypto";
import {IdentityKeyPair, KeyPair, PreKey, SignedPreKey} from "./model";

export class KeyHelper {

    static GenerateIdentityKeyPair(): KeyPair {
        return Crypto.CreateKeyPair();
    }

    static GenerateRegistrationId(): number {
        let registrationId = new Uint16Array(Crypto.GetRandomBytes(2))[0];
        return registrationId & 0x3fff;
    }

    static GenerateSignedPreKey(identityKeyPair: IdentityKeyPair, signedKeyId: number): SignedPreKey {
        if (signedKeyId <= 0) {
            console.error('dra: Invalid argument for signedKeyId: ' + signedKeyId);
            return null;
        }

        let keyPair = Crypto.CreateKeyPair();
        let sig = Crypto.Ed25519Sign(identityKeyPair.privKeyEd, keyPair.pubKeyX.buffer);

        let r = new SignedPreKey();
        r.keyId = signedKeyId;
        r.keyPair = keyPair;
        r.signature = sig;
        return r;
    }

    static GeneratePreKey(keyId: number): PreKey {
        if (keyId < 0) {
            console.error('dra: Invalid argument for keyId: ' + keyId);
            return null;
        }

        let r = new PreKey();
        r.keyId = keyId;
        r.keyPair = Crypto.CreateKeyPair();
        return r;
    }
}