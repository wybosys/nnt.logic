import {IndexedObject} from "./model";
import {ArrayT} from "./utils";

export class EventDispatcher {

    addListener(event: string, cb: (...args: any[]) => void) {
        let events = this._events,
            callbacks = events[event] = events[event] || [];
        callbacks.push(cb);
    }

    removeListener(event: string, cb: (...args: any[]) => void) {
        let events = this._events,
            callbacks = events[event];
        ArrayT.RemoveObject(callbacks, cb);
    }

    raiseEvent(event: string, ...args: any[]) {
        let callbacks = this._events[event];
        if (!callbacks)
            return;
        for (let i = 0, l = callbacks.length; i < l; ++i) {
            callbacks[i].apply(null, args);
        }
    }

    private _events: IndexedObject = {};
}