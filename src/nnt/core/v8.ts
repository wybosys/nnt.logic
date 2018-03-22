import {logger} from "./logger";

let ExtERROR: any = Error;

function CALLEE(args: IArguments) {
    try {
        return args.callee;
    }
    catch (err) {
        logger.exception(err);
    }
    return null;
}

declare let __stack: any;
Object.defineProperty(global, '__stack', {
    get: function () {
        let ce = CALLEE(arguments);
        if (!ce)
            return null;
        let orig = ExtERROR.prepareStackTrace;
        ExtERROR.prepareStackTrace = function (_: any, stack: any) {
            return stack;
        };
        let err = new Error;
        Error.captureStackTrace(err, ce);
        let stack = err.stack;
        ExtERROR.prepareStackTrace = orig;
        return stack;
    }
});

export class Capture {
    constructor(off = 1) {
        this._stack = __stack[off];
    }

    private _stack: any;

    lineno() {
        if (!this._stack)
            return 0;
        return this._stack.getLineNumber();
    }

    funcName() {
        if (!this._stack)
            return "";
        return this._stack.getFunctionName();
    }

    url() {
        if (!this._stack)
            return "";
        return this._stack.getScriptNameOrSourceURL();
    }
}

export function Classname(obj: any): string {
    return obj["name"];
}