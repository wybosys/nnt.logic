/*
 * jobQueue manages multiple queues indexed by device to serialize
 * session io ops on the database.
 */

import {IndexedObject} from "../../../core/kernel";

export type SessionJob<T> = () => Promise<T>;
let jobQueue: IndexedObject = {};

export class SessionLock {

    static QueueJobForNumber<T>(id: string, runJob: SessionJob<T>): SessionJob<T> {
        let runPrevious = jobQueue[id] || Promise.resolve();
        let runCurrent = jobQueue[id] = runPrevious.then(runJob, runJob);
        runCurrent.then(() => {
            if (jobQueue[id] === runCurrent) {
                delete jobQueue[id];
            }
        });
        return runCurrent;
    }

}
