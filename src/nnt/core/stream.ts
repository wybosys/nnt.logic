export class Stream {

    bindRead(stm: NodeJS.ReadableStream): this {
        stm.on("ready", () => {

        });
        this._from = stm;
        this._output = false;
        return this;
    }

    pipe(stm: NodeJS.WritableStream): this {
        if (this._from) {
            this._from.pipe(stm);
            return this;
        }
        return null;
    }

    toBuffer(): Promise<Buffer> {
        return new Promise(resolve => {
            if (this._output || !this._from) {
                resolve(null);
                return;
            }
            let stm = new stmbuf.WritableStreamBuffer();
            stm.on("error", err => {
                logger.error(err);
                resolve(null);
            });
            stm.on("finish", () => {
                this._output = true;
                resolve(<any>stm.getContents());
            });
            this._from.pipe(stm);
        });
    }

    // 保存成文件
    toFile(ph: string): Promise<boolean> {
        return new Promise(resolve => {
            if (this._output || !this._from) {
                resolve(false);
                return;
            }
            let stm = fs.createWriteStream(ph);
            stm.on("error", err => {
                logger.error(err);
                resolve(false);
            });
            stm.on("finish", () => {
                this._output = true;
                resolve(true);
            });
            this._from.pipe(stm);
        });
    }

    private _from: NodeJS.ReadableStream;
    private _output: boolean = true;
}
