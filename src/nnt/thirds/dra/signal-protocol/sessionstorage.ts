export abstract class SessionStorage {

    abstract async loadSession(encodedNumber: string): Promise<string>;

    abstract async storeSession(address: string, serialzed: string): Promise<void>;

    abstract async getIdentityKeyPair(): Promise<any>;

    abstract async removePreKey(keyid: string): Promise<void>;

    abstract async isTrustedIdentity(): Promise<boolean>;

    abstract async saveIdentity(): Promise<void>;
}
