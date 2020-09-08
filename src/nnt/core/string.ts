export function UpcaseFirst(str: string): string {
    if (!str || !str.length)
        return "";
    return str[0].toUpperCase() + str.substr(1);
}

/** 拉开，如果不足制定长度，根据mode填充
 * @param str 输入的字符串
 * @param len 指定的目标长度
 * @param mode 0:中间填充，1:左边填充，2:右边填充
 * @param wide 是否需要做宽字符补全，如果str为中文并且sep为单字节才需要打开
 * @param sep 用以填充的字符
 */
export function Stretch(str: string, len: number, mode: number = 0, sep: string = ' ', wide = true): string {
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

export function FromArrayBuffer(buf: ArrayBuffer): string {
    let bytes = new Uint8Array(buf);
    let out, i, len, c;
    let char2, char3;
    out = "";
    len = bytes.length;
    i = 0;
    while (i < len) {
        c = bytes[i++];
        switch (c >> 4) {
            case 0:
            case 1:
            case 2:
            case 3:
            case 4:
            case 5:
            case 6:
            case 7:
                // 0xxxxxxx
                out += String.fromCharCode(c);
                break;
            case 12:
            case 13:
                // 110x xxxx   10xx xxxx
                char2 = bytes[i++];
                out += String.fromCharCode(((c & 0x1F) << 6) | (char2 & 0x3F));
                break;
            case 14:
                // 1110 xxxx  10xx xxxx  10xx xxxx
                char2 = bytes[i++];
                char3 = bytes[i++];
                out += String.fromCharCode(((c & 0x0F) << 12) |
                    ((char2 & 0x3F) << 6) |
                    ((char3 & 0x3F) << 0));
                break;
        }
    }
    return out;
}
