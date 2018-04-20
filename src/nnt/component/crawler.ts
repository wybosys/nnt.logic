import {ArrayT, asString, SafeEval} from "../core/kernel";
import {logger} from "../core/logger";
import tmp = require('tmp');
import fs = require('fs');

const spawn = require('child_process').spawn;

function pack_value(val: any): string {
    let str = asString(val);
    if (typeof val == "string")
        return '"' + str + '"';
    return str;
}

function safe_time(second: number): number {
    return second ? second * 1000 : null;
}

function pack_function(fun: Function): string {
    if (!fun)
        return null;
    let str = fun.toString();
    // let需要换成var
    str = str.replace(/let /g, 'var ');
    // ()=> 换成 function ()
    str = str.replace(/\(([a-zA-Z0-9_, ]+)\) =>/g, "function ($1)")
    // 替换console为alert，否则无法从evaluate中传出
    str = str.replace(/console\.(log|warn)\(/g, 'alert(');
    return str;
}

function pack_arguments(args: any[]): string {
    if (!args || args.length == 0)
        return null;
    return ArrayT.Convert(args, pack_value).join(', ');
}

// 每一步生成对应的代码，然后最终生成临时的casperjs文件
export class Crawler {

    private _buffer: string[] = [];

    protected cmd(cmd: string, ...cmps: any[]): this {
        cmps = ArrayT.QueryObjects(cmps, e => e != null);
        this._buffer.push('hdl.' + cmd + '(' + cmps.join(', ') + ');');
        return this;
    }

    connect(url: string, then?: () => void): this {
        return this.start(url, then);
    }

    start(url: string, then?: () => void): this {
        return this.cmd('start', '"' + url + '"', pack_function(then));
    }

    run(): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            // 生成最终执行的脚本
            let cmds: string[] = [];
            ArrayT.PushObjects(cmds, [
                'function Output(hdl, typ, obj) { hdl.echo(JSON.stringify({type:typ, payload:obj}) + ","); }',
                'function hookError(hdl, msg, btrace) { Output(hdl, "error", msg); };',
                'function hookAlert(hdl, msg) { Output(hdl, "log", msg); };',
                'var hdl = require("casper").create({onError:hookError, onAlert:hookAlert});',
                // 抛出返回值
                'hdl.result = function(obj) { Output(this, "result", obj); }',
                'hdl.log = function (obj) { Output(this, "info", obj); };'
            ]);
            ArrayT.PushObjects(cmds, this._buffer);
            ArrayT.PushObjects(cmds, [
                'hdl.run();'
            ]);

            // 命令保存到文件
            let text = cmds.join('\n');
            //logger.log(text);
            let tf = tmp.fileSync();
            fs.writeSync(tf.fd, text);

            let output: any;
            let err: string;

            // 执行
            let proc = spawn('casperjs', [tf.name]);
            proc.stdout.on('data', (data: Uint8Array) => {
                let msg = data.toString();
                msg = '[' + msg + ']';
                // 分解结果
                let msgs = SafeEval(msg);
                if (!msgs) {
                    logger.warn("无法处理数据 " + msg);
                    return;
                }
                msgs.forEach((msg: any) => {
                    switch (msg.type) {
                        case 'result': {
                            output = msg.payload;
                        }
                            break;
                        case 'log': {
                            logger.log(msg.payload);
                        }
                            break;
                        case 'warn': {
                            logger.warn(msg.payload);
                        }
                            break;
                        case 'info': {
                            if (msg.payload.indexOf('[alert]') != -1)
                                return;
                            logger.info(msg.payload);
                        }
                            break;
                    }
                });
                let result = ArrayT.QueryObject(msgs, (e: any) => {
                    return e.type == 'result';
                });
                if (result) {
                    output = result.payload;
                }
            });
            proc.stderr.on('data', (data: Uint8Array) => {
                err = data.toString();
                logger.warn(err);
            });
            proc.on('close', () => {
                if (err)
                    reject(new Error(err));
                else
                    resolve(output);
            });
        });
    }

    evaluate(func: Function, ...args: any[]): this {
        return this.cmd('evaluate', pack_function(func), pack_arguments(args));
    }

    then(then: Function, ...args: any[]): this {
        let sf = pack_function(then);
        if (sf && args) {
            sf = 'function(){(' + sf + ').call(this, ' + pack_arguments(args) + ');}';
        }
        return this.cmd('then', sf);
    }

    wait(second: number, then?: () => void): this {
        return this.cmd('wait', safe_time(second), pack_function(then));
    }

    echo(str: string, style?: string): this {
        return this.cmd('echo', str, style);
    }

    exit(): this {
        return this.cmd('exit');
    }
}