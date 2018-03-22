"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var utils_1 = require("./utils");
var EventDispatcher = /** @class */ (function () {
    function EventDispatcher() {
        this._events = {};
    }
    EventDispatcher.prototype.addListener = function (event, cb) {
        var events = this._events, callbacks = events[event] = events[event] || [];
        callbacks.push(cb);
    };
    EventDispatcher.prototype.removeListener = function (event, cb) {
        var events = this._events, callbacks = events[event];
        utils_1.ArrayT.RemoveObject(callbacks, cb);
    };
    EventDispatcher.prototype.raiseEvent = function (event) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        var callbacks = this._events[event];
        if (!callbacks)
            return;
        for (var i = 0, l = callbacks.length; i < l; ++i) {
            callbacks[i].apply(null, args);
        }
    };
    return EventDispatcher;
}());
exports.EventDispatcher = EventDispatcher;
