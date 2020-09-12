import {ChainType, KeyPair, PreKey, SignedPreKey} from "./model";

export abstract class SessionStorage {

    abstract async getIdentityKeyPair(): Promise<KeyPair>;

    abstract async isTrustedIdentity(identifier: string, identityKey: KeyPair, ct: ChainType): Promise<boolean>;

    abstract async loadIdentityKey(identifier: string): Promise<KeyPair>;

    abstract async saveIdentity(identifier: string, key: KeyPair): Promise<boolean>;

    abstract async loadPreKey(keyId: number): Promise<PreKey>;

    abstract async storePreKey(keyId: number, key: KeyPair): Promise<void>;

    abstract async removePreKey(keyId: number): Promise<void>;

    abstract async loadSignedPreKey(keyId: number): Promise<SignedPreKey>;

    abstract async storeSignedPreKey(keyId: number, key: KeyPair): Promise<void>;

    abstract async removeSignedPreKey(keyId: number): Promise<void>;

    abstract async loadSession(encodedNumber: string): Promise<string>;

    abstract async storeSession(identifier: string, serialzed: string): Promise<void>;

    abstract async removeSession(identifier: string): Promise<void>;

    abstract async removeAllSessions(identifier: string): Promise<void>;

    abstract async getLocalRegistrationId(): Promise<number>;

}
