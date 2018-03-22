import {IndexedObject} from "../core/kernel";
import {FieldValidProc} from "../core/proto";
import {STATUS} from "../core/models";

export function Add(word: string) {
    word && addWord(word);
}

export function Filter(str: string): string {
    if (!str)
        return str;
    return filter(str);
}

// 检查是否有敏感词，=false代表有敏感词
export const Check: FieldValidProc = (str: string): boolean => {
    return str == Filter(str);
}

Check.status = STATUS.MASK_WORD;

// 一下为基于DFA的过滤器实现

let map: IndexedObject = {};

function addWord(word: string) {
    var parent = map;
    for (var i = 0; i < word.length; i++) {
        if (!parent[word[i]])
            parent[word[i]] = {}
        parent = parent[word[i]]
    }
    parent.isEnd = true
}

function filter(s: string): string {
    var parent = map
    for (var i = 0; i < s.length; i++) {
        if (s[i] == '*') {
            continue
        }

        var found = false
        var skip = 0
        var sWord = ''

        for (var j = i; j < s.length; j++) {

            if (!parent[s[j]]) {
                // console.log('skip ', s[j])
                found = false
                skip = j - i
                parent = map
                break;
            }

            sWord = sWord + s[j]
            if (parent[s[j]].isEnd) {
                found = true
                skip = j - i
                break
            }
            parent = parent[s[j]]
        }

        if (skip > 1) {
            i += skip - 1
        }

        if (!found) {
            continue
        }

        var stars = '*'
        for (var k = 0; k < skip; k++) {
            stars = stars + '*'
        }

        var reg = new RegExp(sWord, 'g')
        s = s.replace(reg, stars)

    }

    return s
}