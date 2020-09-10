import {Crypto, KeyPair} from "./crypto";

export class KeyHelper {

    static GenerateIdentityKeyPair(): KeyPair {
        return Crypto.CreateKeyPair();
    }

    static GenerateRegistrationId(): number {
        let registrationId = new Uint16Array(Crypto.GetRandomBytes(2))[0];
        return registrationId & 0x3fff;
    }

    static GenerateSignedPreKey(identityKeyPair, signedKeyId) {
        if (!(identityKeyPair.privKey instanceof ArrayBuffer) ||
            identityKeyPair.privKey.byteLength != 32 ||
            !(identityKeyPair.pubKey instanceof ArrayBuffer) ||
            identityKeyPair.pubKey.byteLength != 33) {
            throw new TypeError('Invalid argument for identityKeyPair');
        }
        if (!isNonNegativeInteger(signedKeyId)) {
            throw new TypeError(
                'Invalid argument for signedKeyId: ' + signedKeyId
            );
        }

        return Internal.crypto.createKeyPair().then(function (keyPair) {
            return Internal.crypto.Ed25519Sign(identityKeyPair.privKey, keyPair.pubKey).then(function (sig) {
                return {
                    keyId: signedKeyId,
                    keyPair: keyPair,
                    signature: sig
                };
            });
        });
    }

    static GeneratePreKey(keyId: number) {
        if (!isNonNegativeInteger(keyId)) {
            throw new TypeError('Invalid argument for keyId: ' + keyId);
        }

        return Internal.crypto.createKeyPair().then(function (keyPair) {
            return {keyId: keyId, keyPair: keyPair};
        });
    }
}