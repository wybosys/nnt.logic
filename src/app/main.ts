import {App, BOOT, Hook, STARTED} from "../nnt/manager/app";
import {Clusters} from "../nnt/manager/clusters";
import {Config} from "../nnt/manager/config";

export function launch() {
    let cfg = App.LoadConfig("~/app.json");

    Clusters.Run(() => {
        let app = new App();
        app.entryDir = "~/bin/";
        app.assetDir = "~/assets/";
        app.start();
    }, Config.CLUSTER_PARALLEL);
}