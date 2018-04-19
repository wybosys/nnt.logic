import {logger} from "../core/logger";
import {IndexedObject} from "../core/kernel";
import {Config} from "../manager/config";

let Spooky = require('spooky');

function safe_time(second: number): number {
    return second ? second * 1000 : null;
}

type ArgumentFunction = IndexedObject | Function;
type ArgumentFunctions = ArgumentFunction[];

export class Crawler {

    connect(url?: string): Promise<void> {
        return new Promise<void>((resolv, reject) => {
            let opt: any = {
                child: {
                    port: 10008
                },
                casper: {
                    logLevel: 'debug',
                    verbose: true
                }
            };
            // 不能在ideau中调试打开http的模式
            if (!Config.DEBUG)
                opt.child['transport'] = 'http';
            let hdl = new Spooky(opt, (err: Error) => {
                if (err) {
                    logger.log(err.message);
                    reject(err);
                    return;
                }

                this._hdl = hdl;
                hdl.on('error', (e: any, stack: any) => {
                    logger.error(e);
                    if (stack)
                        logger.log(stack);
                });

                hdl.on('console', (line: string) => {
                    logger.log(line);
                });

                hdl.on('log', (log: any) => {
                    if (log.space === 'remote')
                        logger.log(log.message.replace(/ \- .*/, ''));
                });

                if (url)
                    this.start(url);
                resolv();
            });
        });
    }

    _hdl: any;

    start(url: string, then?: () => void) {
        return this._hdl.start(url, then);
    }

    run(): Promise<void> {
        return new Promise<void>(resolve => {
            this._hdl.on('::run::end', () => {
                resolve();
            });
            this._hdl.run(function () {
                this.emit('::run::end');
                this.exit();
            });
        });
    }

    evaluate(func: Function, ...args: any[]) {
        return this._hdl.evaluate.apply(this._hdl, arguments);
    }

    then(then: Function | ArgumentFunctions) {
        return this._hdl.then(then);
    }

    thenEvaluate(func: Function, ...args: any[]) {
        return this._hdl.thenEvaluate.apply(this._hdl, arguments);
    }

    thenClick(selector: string, then?: () => void) {
        return this._hdl.thenClick(selector, then);
    }

    wait(second: number, then?: () => void) {
        return this._hdl.wait(safe_time(second), then);
    }

    waitFor(test: () => boolean, then?: () => void, timeout?: () => void, second?: number, details?: any) {
        return this._hdl.waitFor(test, then, timeout, safe_time(second), details);
    }

    waitForSelector(selector: string, then?: () => void, timeout?: () => void, second?: number) {
        return this._hdl.waitForSelector(selector, then, timeout, safe_time(second));
    }

    echo(str: string, style?: string) {
        return this._hdl.echo(str, style ? style : 'INFO');
    }

    exit() {
        this._hdl.exit();
    }

    on(idr: string, cb: (data: any) => void) {
        return this._hdl.on(idr, cb);
    }

    collect(varnm: string) {
        this.on(varnm, (data: any) => {
            this._collects[varnm] = data;
        });
    }

    result(varnm: string): any {
        return this._collects[varnm];
    }

    private _collects: IndexedObject = {};
}