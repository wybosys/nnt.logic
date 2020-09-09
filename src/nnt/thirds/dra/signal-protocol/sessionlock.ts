/*
 * jobQueue manages multiple queues indexed by device to serialize
 * session io ops on the database.
 */

import {IndexedObject} from "../../../core/kernel";

type Job = Promise<void>;
let jobQueue: IndexedObject = {};

class SessionLock {

    static QueueJobForNumber(id: number, runJob: Job): Job {
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
