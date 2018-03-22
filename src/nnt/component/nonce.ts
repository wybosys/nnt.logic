import {ArrayT} from "../core/kernel";

let ALPHAS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

let DIGITALS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

let ALDIGS = ALPHAS.concat(DIGITALS);

export function Nonce(arr: any[], len: number): string {
    let r = "";
    while (len--)
        r += ArrayT.Random(arr);
    return r;
}

export function NonceAlpha(len: number): string {
    return Nonce(ALPHAS, len);
}

export function NonceDigital(len: number): string {
    return Nonce(DIGITALS, len);
}

export function NonceAlDig(len: number): string {
    return Nonce(ALDIGS, len);
}