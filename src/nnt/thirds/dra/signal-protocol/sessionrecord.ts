import {ArrayT, IndexedObject, KvObject, toJson} from "../../../core/kernel";
import {Session, X25519Key} from "./model";

const ARCHIVED_STATES_MAX_LENGTH = 40;
const OLD_RATCHETS_MAX_LENGTH = 10;
const SESSION_RECORD_VERSION = 'v1';

export class SessionRecord {

    private _sessions: KvObject<Session> = {};
    private _version = SESSION_RECORD_VERSION;

    static Deserialize(serialized: string): SessionRecord {
        let data = JSON.parse(serialized);
        if (data.version !== SESSION_RECORD_VERSION) {
            throw new Error("版本不匹配");
        }

        let record = new SessionRecord();
        record._version = data.version;
        for (let k in data.sessions) {
            let ses = new Session();
            ses.fromPod(data.sessions[k]);
            record._sessions[k] = ses;
        }

        return record;
    }

    serialize(): string {
        let sess: IndexedObject = {};
        for (let k in this._sessions) {
            sess[k] = this._sessions[k].toPod();
        }
        return toJson({
            version: this._version,
            sessions: sess
        });
    }

    haveOpenSession(): boolean {
        return this.getOpenSession() != null;
    }

    getSessionByBaseKey(baseKey: X25519Key): Session {
        let session = this._sessions[baseKey.toString()];
        if (session && session.indexInfo.baseKeyType === BaseKeyType.OURS) {
            throw new Error("dra: Tried to lookup a session using our basekey");
        }
        return session;
    }

    getSessionByRemoteEphemeralKey(remoteEphemeralKey: X25519Key): Session {
        this.detectDuplicateOpenSessions();

        let searchKey = remoteEphemeralKey.toString();
        let openSession: Session;

        for (let key in this._sessions) {
            let cur = this._sessions[key];
            if (cur.indexInfo.timeClosed == -1) {
                openSession = cur;
            }

            if (cur.remoteEphemeralKeys.has(searchKey))
                return cur;
        }

        return null;
    }

    getOpenSession(): Session {
        this.detectDuplicateOpenSessions();

        for (let key in this._sessions) {
            let cur = this._sessions[key];
            if (cur.indexInfo.timeClosed == -1) {
                return cur;
            }
        }

        return null;
    }

    detectDuplicateOpenSessions() {
        let openSession: Session;
        for (let key in this._sessions) {
            let cur = this._sessions[key];
            if (cur.indexInfo.timeClosed == -1) {
                if (openSession) {
                    throw new Error("dra: Datastore inconsistensy: multiple open sessions");
                }
                openSession = cur;
            }
        }
    }

    updateSessionState(session: Session) {
        let sessions = this._sessions;

        this.removeOldChains(session);

        sessions[session.indexInfo.baseKey.toString()] = session;

        this.removeOldSessions();
    }

    getSessions(): Session[] {
        // return an array of sessions ordered by time closed,
        // followed by the open session
        let list: Session[] = [];
        let openSession: Session;
        for (let k in this._sessions) {
            let cur = this._sessions[k];
            if (cur.indexInfo.timeClosed == -1) {
                openSession = cur;
            } else {
                list.push(cur);
            }
        }

        list = list.sort((s1, s2) => {
            return s1.indexInfo.timeClosed - s2.indexInfo.timeClosed;
        });

        if (openSession) {
            list.push(openSession);
        }
        return list;
    }

    archiveCurrentState() {
        let open_session = this.getOpenSession();
        if (open_session) {
            console.log('closing session');
            open_session.indexInfo.timeClosed = Date.now();
            this.updateSessionState(open_session);
        }
    }

    promoteState(session: Session) {
        console.log('promoting session');
        session.indexInfo.timeClosed = -1;
    }

    removeOldChains(session: Session) {
        // Sending ratchets are always removed when we step because we never need them again
        // Receiving ratchets are added to the oldRatchetList, which we parse
        // here and remove all but the last ten.
        while (session.oldRatchetList.length > OLD_RATCHETS_MAX_LENGTH) {
            let index = 0;
            let oldest = session.oldRatchetList[0];
            for (let i = 0; i < session.oldRatchetList.length; i++) {
                let cur = session.oldRatchetList[i];
                if (cur.added < oldest.added) {
                    oldest = cur;
                    index = i;
                }
            }
            console.log("Deleting chain closed at", oldest.added);
            session.chains.delete(oldest.ephemeralKey.toString());
            ArrayT.RemoveObjectAtIndex(session.oldRatchetList, index);
        }
    }

    removeOldSessions() {
        // Retain only the last 20 sessions
        let sessions = this._sessions;
        let oldestBaseKey, oldestSession;
        while (Object.keys(sessions).length > ARCHIVED_STATES_MAX_LENGTH) {
            for (let key in sessions) {
                let session = sessions[key];
                if (session.indexInfo.timeClosed > -1 && // session is closed
                    (!oldestSession || session.indexInfo.timeClosed < oldestSession.indexInfo.timeClosed)) {
                    oldestBaseKey = key;
                    oldestSession = session;
                }
            }
            console.log("Deleting session closed at", oldestSession.indexInfo.timeClosed);
            delete sessions[oldestBaseKey.toString()];
        }
    }

    deleteAllSessions() {
        // Used primarily in session reset scenarios, where we really delete sessions
        this._sessions = {};
    }
}