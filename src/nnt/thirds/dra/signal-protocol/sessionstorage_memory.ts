import {SessionStorage} from "./sessionstorage";
import {ChainType, KeyPair, PreKey, SignedPreKey} from "./model";
import {IndexedObject} from "../../../core/kernel";
import {Address} from "./address";

export class SessionStorageMemory extends SessionStorage {

    async getIdentityKeyPair(): Promise<KeyPair> {
        return this.get('identityKey');
    }

    async isTrustedIdentity(identifier: string, identityKey: KeyPair, ct: ChainType): Promise<boolean> {
        if (!identifier) {
            throw new Error("dra: tried to check identity key for undefined/null key");
        }
        let trusted = this.get('identityKey' + identifier);
        if (!trusted) {
            return true;
        }
        return identityKey.isEqual(trusted);
    }

    async loadIdentityKey(identifier: string): Promise<KeyPair> {
        if (!identifier)
            throw new Error("dra: Tried to get identity key for undefined/null key");
        return this.get('identityKey' + identifier);
    }

    async saveIdentity(identifier: string, identityKey: KeyPair): Promise<boolean> {
        if (!identifier)
            throw new Error("dra: Tried to put identity key for undefined/null key");

        let address = Address.FromString(identifier);
        let existing = this.get('identityKey' + address.name);
        this.set('identityKey' + address.name, identityKey)

        return existing && !identityKey.isEqual(existing);
    }

    async loadPreKey(keyId: number): Promise<PreKey> {
        return this.get('25519KeypreKey' + keyId);
    }

    async storePreKey(keyId: number, key: KeyPair): Promise<void> {
        this.set('25519KeypreKey' + keyId, key);
    }

    async removePreKey(keyId: number): Promise<void> {
        this.del('25519KeypreKey' + keyId);
    }

    async loadSignedPreKey(keyId: number): Promise<SignedPreKey> {
        return this.get('25519KeysignedKey' + keyId);
    }

    async storeSignedPreKey(keyId: number, key: KeyPair): Promise<void> {
        this.set('25519KeysignedKey' + keyId, key);
    }

    async removeSignedPreKey(keyId: number): Promise<void> {
        this.del('25519KeysignedKey' + keyId);
    }

    async loadSession(identifier: string): Promise<string> {
        return this.get('session' + identifier);
    }

    async storeSession(identifier: string, record: string): Promise<void> {
        this.set('session' + identifier, record);
    }

    async removeSession(identifier: string): Promise<void> {
        this.del('session' + identifier);
    }

    async removeAllSessions(identifier: string): Promise<void> {
        for (let id in this._db) {
            if (id.startsWith('session' + identifier)) {
                delete this._db[id];
            }
        }
    }

    async storeLocalRegistrationId(id: number): Promise<void> {
        this.set('registrationId', id);
    }

    async getLocalRegistrationId(): Promise<number> {
        return this.get('registrationId');
    }

    private get(key: any, def: any = null): any {
        return key in this._db ? this._db[key] : def;
    }

    private set(key: any, val: any) {
        this._db[key] = val;
    }

    private del(key: any) {
        if (key in this._db)
            delete this._db[key];
    }

    private _db: IndexedObject = {};
}