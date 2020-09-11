import {FixedBuffer32} from "../../../core/buffer";
import {ChainType} from "./sessionrecord";
import {IdentityKeyPair, PreKey, SignedPreKey, X25519Key} from "./model";

export abstract class SessionStorage {

    abstract async loadSession(encodedNumber: string): Promise<string>;

    abstract async storeSession(address: string, serialzed: string): Promise<void>;

    abstract async getIdentityKeyPair(): Promise<IdentityKeyPair>;

    abstract async removePreKey(keyid: string): Promise<void>;

    abstract async isTrustedIdentity(name: string, identityKey: FixedBuffer32, ct: ChainType): Promise<boolean>;

    abstract async saveIdentity(address: string, key: X25519Key): Promise<void>;

    abstract async loadPreKey(keyId: number): Promise<PreKey>;

    abstract async loadSignedPreKey(keyId: number): Promise<SignedPreKey>;

    abstract async getLocalRegistrationId(): Promise<number>;
}
