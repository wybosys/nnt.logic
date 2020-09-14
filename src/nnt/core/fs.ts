import * as fs from "fs";

export class Fs {

    // 同步复制文件
    static copySync(from: string, to: string): boolean {
        let suc = true;
        try {
            fs.writeFileSync(to, fs.readFileSync(from));
        } catch (err) {
            suc = false;
            console.error(err);
        }
        return suc;
    }

    static copyAndDelete(from: string, to: string, cb: (err: Error) => void) {
        let readStream = fs.createReadStream(from);
        let writeStream = fs.createWriteStream(to);
        readStream.on('error', cb);
        writeStream.on('error', cb);
        readStream.on('close',
            function () {
                fs.unlink(from, cb);
            }
        );
        readStream.pipe(writeStream);
    }

    // 重命名文件
    static move(from: string, to: string, cb: (err: Error) => void) {
        fs.rename(from, to,
            function (err) {
                if (err) {
                    if (err.code === 'EXDEV') {
                        Fs.copyAndDelete(from, to, cb);
                    } else {
                        cb(err);
                    }
                    return;
                }
                cb(err);
            }
        );
    }
}
