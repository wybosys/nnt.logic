import {User} from "./user";
import {SObject} from "../../nnt/core/object";
import {logger} from "../../nnt/core/logger";

export class Manager extends SObject {

    constructor() {
        super();
        this.signals.register('hello');
        this.signals.connect('hello', this._cbHello, this);
    }

    private static _shared: Manager;

    static shared(): Manager {
        if (this._shared == null)
            this._shared = new Manager();
        return this._shared;
    }

    private _user = new User();
    get user(): User {
        return this._user;
    }

    private _cbHello() {
        logger.info("manager::hello");
    }
}
