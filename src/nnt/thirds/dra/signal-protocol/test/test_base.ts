import {SessionStorage} from "../sessionstorage";
import {Device} from "../model";
import {KeyHelper} from "../keyhelper";

export async function generatePreKeyBundle(store: SessionStorage, preKeyId: number, signedPreKeyId: number): Promise<Device> {
    let identity = await store.getIdentityKeyPair();
    let registrationId = await store.getLocalRegistrationId();

    let preKey = KeyHelper.GeneratePreKey(preKeyId);
    let signedPreKey = KeyHelper.GenerateSignedPreKey(identity, signedPreKeyId);

    await store.storePreKey(preKeyId, preKey);
    await store.storeSignedPreKey(signedPreKeyId, signedPreKey);

    let r = new Device();
    r.identityKey = identity;
    r.registrationId = registrationId;
    r.preKey = preKey;
    r.signedPreKey = signedPreKey;
    return r;
}

export async function generateIdentity(store: SessionStorage) {
    let identityKey = KeyHelper.GenerateIdentityKeyPair();
    let registrationId = KeyHelper.GenerateRegistrationId();
    await store.saveIdentity('', identityKey);
    await store.storeLocalRegistrationId(registrationId);
}