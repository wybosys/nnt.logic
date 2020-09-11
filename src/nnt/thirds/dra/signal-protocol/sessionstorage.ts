import {ChainType, KeyPair, PreKey, SignedPreKey} from "./model";

export abstract class SessionStorage {

    abstract async loadSession(encodedNumber: string): Promise<string>;

    abstract async storeSession(address: string, serialzed: string): Promise<void>;

    abstract async getIdentityKeyPair(): Promise<KeyPair>;

    abstract async removePreKey(keyid: number): Promise<void>;

    abstract async isTrustedIdentity(name: string, identityKey: KeyPair, ct: ChainType): Promise<boolean>;

    abstract async saveIdentity(address: string, key: KeyPair): Promise<void>;

    abstract async loadPreKey(keyId: number): Promise<PreKey>;

    abstract async loadSignedPreKey(keyId: number): Promise<SignedPreKey>;

    abstract async getLocalRegistrationId(): Promise<number>;
}
