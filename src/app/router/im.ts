import {action, IRouter} from "../../nnt/core/router";
import {Trans} from "../model/trans";
import {ImLogin, ImLogout, ImMessage, ImMessages, ImMessageUnreadCount} from "../model/im";

export class RIm implements IRouter {
    action = "im";

    @action(ImLogin)
    login(trans: Trans) {

    }

    @action(ImLogout)
    logout(trans: Trans) {

    }

    @action(ImMessage)
    send(trans: Trans) {

    }

    @action(ImMessageUnreadCount)
    unreadcount(trans: Trans) {

    }

    @action(ImMessages)
    receive(trans: Trans) {

    }
}