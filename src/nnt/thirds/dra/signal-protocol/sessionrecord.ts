enum BaseKeyType {
    OURS = 1,
    THEIRS = 2
}

enum ChainType {
    SENDING = 1,
    RECEIVING = 2
}

const ARCHIVED_STATES_MAX_LENGTH = 40;
const OLD_RATCHETS_MAX_LENGTH = 10;
const SESSION_RECORD_VERSION = 'v1';

function isStringable() {

}

function ensureStringed() {

}

function jsonThing() {

}

function migrate() {

}

class SessionRecord {

    deserialize() {

    }

    serialize() {

    }

    haveOpenSession() {

    }

    getSessionByBaseKey() {

    }

    getSessionByRemoteEphemeralKey() {

    }

    getOpenSession() {

    }

    detectDuplicateOpenSessions() {

    }

    updateSessionState() {

    }

    getSessions() {

    }

    archiveCurrentState() {

    }

    promoteState() {

    }

    removeOldChains() {

    }

    removeOldSessions() {

    }

    deleteAllSessions() {
        
    }
}