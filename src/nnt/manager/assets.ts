import {RegisterScheme} from "../core/url";

export class TYPE {
    static JSON = "json";
}

class Assets {

    // 资源目录
    directory: string;

}

RegisterScheme("assets", body => {
    return assets.directory + body;
});

export let assets = new Assets();