import {App} from "../nnt/manager/app";
import {Clusters} from "../nnt/manager/clusters";
import {Config} from "../nnt/manager/config";
import {test_signal_protocol} from "../nnt/thirds/dra/signal-protocol/test";

export function launch() {
    App.LoadConfig();

    Clusters.Run(() => {
        let app = new App();
        app.entryDir = "~/bin/";
        app.assetDir = "~/assets/";
        app.start();
    }, Config.CLUSTER_PARALLEL);
}

test_signal_protocol();