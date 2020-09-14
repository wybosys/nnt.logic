export class StringT {

    // 去除掉float后面的0
    static TrimFloat(str: string): string {
        let lr = str.split('.');
        if (lr.length != 2) {
            console.warn("传入的 stirng 格式错误");
            return str;
        }

        let ro = lr[1], m = false, rs = '';
        for (let i = ro.length; i > 0; --i) {
            let c = ro[i - 1];
            if (!m && c != '0')
                m = true;
            if (m)
                rs = c + rs;
        }
        if (rs.length == 0)
            return lr[0];
        return lr[0] + '.' + rs;
    }

    static Hash(str: string): number {
        let hash = 0;
        if (str.length == 0)
            return hash;
        for (let i = 0; i < str.length; ++i) {
            hash = (((hash << 5) - hash) + str.charCodeAt(i)) & 0xffffffff;
        }
        return hash;
    }

    static Contains(str: string, ...tgt: string[]): boolean {
        for (let i = 0, l = tgt.length; i < l; ++i) {
            if (str.indexOf(tgt[i]) != -1)
                return true;
        }
        return false;
    }

    static Count(str: string, substr: string): number {
        let pos = str.indexOf(substr);
        if (pos == -1)
            return 0;
        let r = 1;
        r += this.Count(str.substr(pos + substr.length), substr);
        return r;
    }

    /** 计算ascii的长度 */
    static AsciiLength(str: string): number {
        let r = 0;
        for (let i = 0; i < str.length; ++i) {
            let c = str.charCodeAt(i);
            r += c > 128 ? 2 : 1;
        }
        return r;
    }

    /** 拆分，可以选择是否去空 */
    static Split(str: string, sep: string, skipempty: boolean = true): Array<string> {
        let r = str.split(sep);
        let r0 = new Array();
        r.forEach((e: string) => {
            if (e.length)
                r0.push(e);
        });
        return r0;
    }

    /** 拉开，如果不足制定长度，根据mode填充
     @param mode 0:中间填充，1:左边填充，2:右边填充
     @param wide 是否需要做宽字符补全，如果str为中文并且sep为单字节才需要打开
     */
    static Stretch(str: string, len: number, mode: number = 0, sep: string = ' ', wide = true): string {
        if (str.length >= len)
            return str;
        if (str.length == 0) {
            let r = '';
            while (len--)
                r += sep;
            return r;
        }
        let n = len - str.length;
        let r = '';
        switch (mode) {
            case 0: {
                let c = (len - str.length) / (str.length - 1);
                if (wide)
                    c *= 2;
                if (c >= 1) {
                    // 每个字符后面加sep
                    for (let i = 0; i < str.length - 1; ++i) {
                        r += str[i];
                        for (let j = 0; j < c; ++j)
                            r += sep;
                    }
                    r += str[str.length - 1];
                } else {
                    r = str;
                }
                // 如果不匹配，则补全
                if (r.length < len) {
                    n = len - str.length;
                    if (wide)
                        n *= 2;
                    while (n--)
                        r += sep;
                }
            }
                break;
            case 1: {
                while (n--)
                    r = sep + r;
                r += str;
            }
                break;
            case 2: {
                r = str;
                while (n--)
                    r += sep;
            }
                break;
        }
        return r;
    }

    static Code(s: string): number[] {
        let r = [];
        let l = s.length;
        for (let i = 0; i < l; ++i)
            r.push(s.charCodeAt(i));
        return r;
    }

    static FromCode(c: number[]): string {
        return String.fromCharCode.apply(null, c);
    }

    // 小写化
    static Lowercase(str: string, def = ""): string {
        return str ? str.toLowerCase() : def;
    }

    static Uppercase(str: string, def = ""): string {
        return str ? str.toUpperCase() : def;
    }

    // 标准的substr只支持正向，这里实现的支持两个方向比如，substr(1, -2)
    static SubStr(str: string, pos: number, len?: number): string {
        if (len == null || len >= 0)
            return str.substr(pos, len);
        if (pos < 0)
            pos = str.length + pos;
        pos += len;
        let of = 0;
        if (pos < 0) {
            of = pos;
            pos = 0;
        }
        return str.substr(pos, -len + of);
    }

    static Repeat(str: string, count: number = 1): string {
        let r = "";
        while (count--) {
            r += str;
        }
        return r;
    }
}
