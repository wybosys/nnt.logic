import {SessionStorage} from "./sessionstorage";

export class SessionBuilder {

    constructor(storage: SessionStorage, remoteAddress: string) {
        this._remoteAddress = remoteAddress;
        this._storage = storage;
    }

    private _remoteAddress: string;
    private _storage: SessionStorage;

    processPreKey() {

    }

    processV3() {

    }

    initSession() {

    }

    calculateSendingRatchet() {

    }
}
