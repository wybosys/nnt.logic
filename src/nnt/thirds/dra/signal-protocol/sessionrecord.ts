import {Util} from "./helpers";
import {IndexedObject} from "../../../core/kernel";

export enum BaseKeyType {
    OURS = 1,
    THEIRS = 2
}

export enum ChainType {
    SENDING = 1,
    RECEIVING = 2
}

const ARCHIVED_STATES_MAX_LENGTH = 40;
const OLD_RATCHETS_MAX_LENGTH = 10;
const SESSION_RECORD_VERSION = 'v1';

function IsStringable(obj: any): boolean {
    return obj == Object(obj) && (
        obj instanceof ArrayBuffer ||
        obj instanceof Uint8Array
    );
}

function EnsureStringed(obj: any): any {
    const typ = typeof obj;
    if (typ == "string" || typ == "number" || typ == "boolean") {
        return obj;
    } else if (IsStringable(obj)) {
        return Util.ToString(obj);
    } else if (obj instanceof Array) {
        let array: string[] = [];
        for (let i = 0; i < obj.length; i++) {
            array[i] = EnsureStringed(obj[i]);
        }
        return array;
    } else if (obj == Object(obj)) {
        let obj: IndexedObject = {};
        for (var key in obj) {
            try {
                obj[key] = EnsureStringed(obj[key]);
            } catch (ex) {
                console.log('Error serializing key', key);
                throw ex;
            }
        }
        return obj;
    } else if (obj == null) {
        return null;
    } else {
        throw new Error("unsure of how to jsonify object of type " + typeof obj);
    }
}

function JsonThing(obj: any): string {
    return JSON.stringify(EnsureStringed(obj));
}

export type SessionObject = IndexedObject;

export class SessionRecord {

    private _sessions: IndexedObject = {}; // string -> SessionObject
    private _version = SESSION_RECORD_VERSION;

    static Deserialize(serialized: string): SessionRecord {
        let data = JSON.parse(serialized);
        if (data.version !== SESSION_RECORD_VERSION) {
            throw new Error("版本不匹配");
        }

        let record = new SessionRecord();
        record._sessions = data.sessions;
        if (!record._sessions || Array.isArray(record._sessions)) {
            throw new Error("Error deserializing SessionRecord");
        }
        return record;
    }

    serialize(): string {
        return JsonThing({
            sessions: this._sessions,
            version: this._version
        });
    }

    haveOpenSession(): boolean {
        let openSession = this.getOpenSession();
        return (!!openSession && typeof openSession.registrationId === 'number');
    }

    getSessionByBaseKey(baseKey: Uint8Array): SessionObject {
        let session = this._sessions[Util.ToString(baseKey)];
        if (session && session.indexInfo.baseKeyType === BaseKeyType.OURS) {
            console.log("Tried to lookup a session using our basekey");
            return null;
        }
        return session;
    }

    getSessionByRemoteEphemeralKey(remoteEphemeralKey: Uint8Array): SessionObject {
        this.detectDuplicateOpenSessions();
        var sessions = this._sessions;

        var searchKey = Util.ToString(remoteEphemeralKey);

        var openSession;
        for (var key in sessions) {
            if (sessions[key].indexInfo.closed == -1) {
                openSession = sessions[key];
            }
            if (sessions[key][searchKey] !== undefined) {
                return sessions[key];
            }
        }
        if (openSession !== undefined) {
            return openSession;
        }

        return null;
    }

    getOpenSession(): SessionObject {
        let sessions = this._sessions;
        if (!sessions) {
            return null;
        }

        this.detectDuplicateOpenSessions();

        for (let key in sessions) {
            if (sessions[key].indexInfo.closed == -1) {
                return sessions[key];
            }
        }

        return null;
    }

    detectDuplicateOpenSessions() {
        let openSession: SessionObject;
        let sessions = this._sessions;
        for (let key in sessions) {
            if (sessions[key].indexInfo.closed == -1) {
                if (openSession !== undefined) {
                    throw new Error("Datastore inconsistensy: multiple open sessions");
                }
                openSession = sessions[key];
            }
        }
    }

    updateSessionState(session: SessionObject) {
        let sessions = this._sessions;

        this.removeOldChains(session);

        sessions[Util.ToString(session.indexInfo.baseKey)] = session;

        this.removeOldSessions();
    }

    getSessions(): SessionObject[] {
        // return an array of sessions ordered by time closed,
        // followed by the open session
        let list: SessionObject[] = [];
        let openSession;
        for (var k in this._sessions) {
            if (this._sessions[k].indexInfo.closed === -1) {
                openSession = this._sessions[k];
            } else {
                list.push(this._sessions[k]);
            }
        }
        list = list.sort(function (s1, s2) {
            return s1.indexInfo.closed - s2.indexInfo.closed;
        });
        if (openSession) {
            list.push(openSession);
        }
        return list;
    }

    archiveCurrentState() {
        let open_session = this.getOpenSession();
        if (open_session !== undefined) {
            console.log('closing session');
            open_session.indexInfo.closed = Date.now();
            this.updateSessionState(open_session);
        }
    }

    promoteState(session: SessionObject) {
        console.log('promoting session');
        session.indexInfo.closed = -1;
    }

    removeOldChains(session: SessionObject) {
        // Sending ratchets are always removed when we step because we never need them again
        // Receiving ratchets are added to the oldRatchetList, which we parse
        // here and remove all but the last ten.
        while (session.oldRatchetList.length > OLD_RATCHETS_MAX_LENGTH) {
            let index = 0;
            let oldest = session.oldRatchetList[0];
            for (let i = 0; i < session.oldRatchetList.length; i++) {
                if (session.oldRatchetList[i].added < oldest.added) {
                    oldest = session.oldRatchetList[i];
                    index = i;
                }
            }
            console.log("Deleting chain closed at", oldest.added);
            delete session[Util.ToString(oldest.ephemeralKey)];
            session.oldRatchetList.splice(index, 1);
        }
    }

    removeOldSessions() {
        // Retain only the last 20 sessions
        let sessions = this._sessions;
        let oldestBaseKey, oldestSession;
        while (Object.keys(sessions).length > ARCHIVED_STATES_MAX_LENGTH) {
            for (var key in sessions) {
                var session = sessions[key];
                if (session.indexInfo.closed > -1 && // session is closed
                    (!oldestSession || session.indexInfo.closed < oldestSession.indexInfo.closed)) {
                    oldestBaseKey = key;
                    oldestSession = session;
                }
            }
            console.log("Deleting session closed at", oldestSession.indexInfo.closed);
            delete sessions[Util.ToString(oldestBaseKey)];
        }
    }

    deleteAllSessions() {
        // Used primarily in session reset scenarios, where we really delete sessions
        this._sessions = {};
    }
}