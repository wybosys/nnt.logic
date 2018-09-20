import {User} from "./user";

export class Manager {

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
}
