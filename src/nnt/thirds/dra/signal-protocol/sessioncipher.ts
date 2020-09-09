import {SessionStorage} from "./sessionstorage";

export class SessionCipher {

    constructor(storage: SessionStorage, remoteAddress: string) {
        this._remoteAddress = remoteAddress;
        this._storage = storage;
    }

    private _remoteAddress: string;
    private _storage: SessionStorage;

    getRecord() {

    }

    encrypt() {

    }

    decryptWithSessionList() {

    }

    decryptWhisperMessage() {

    }

    decryptPreKeyWhisperMessage() {

    }

    private doDecryptWhisperMessage() {

    }

    fillMessageKeys() {

    }

    maybeStepRatchet() {

    }

    calculateRatchet() {

    }

    getRemoteRegistrationId() {

    }

    hasOpenSession() {

    }

    closeOpenSessionForDevice() {

    }

    deleteAllSessionsForDevice() {
        
    }
}