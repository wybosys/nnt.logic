import {Crypto, KeyPair} from "./crypto";
import {PreKey} from "./model";
import {logger} from "../../../core/logger";

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

    static GeneratePreKey(keyId: number): PreKey {
        if (keyId < 0) {
            logger.fatal('Invalid argument for keyId: ' + keyId);
            return null;
        }

        let r = new PreKey();
        r.keyId = keyId;
        r.keyPair = Crypto.CreateKeyPair();
        return r;
    }
}