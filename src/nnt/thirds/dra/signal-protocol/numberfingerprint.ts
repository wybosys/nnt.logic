import {Crypto} from "./crypto";

let VERSION = 0;

async function IterateHash(data: Uint8Array, key: Uint8Array, count: number): Promise<Uint8Array> {
    data = Buffer.concat([data, key]);
    return Crypto.Hash(data).then(result => {
        if (--count == 0) {
            return result;
        } else {
            return IterateHash(result, key, count);
        }
    });
}

function ShortToArrayBuffer(d: number): Uint8Array {
    let buf = new Uint16Array([d]);
    return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
}

function GetEncodedChunk(hash: Uint8Array, offset: number): string {
    let chunk = (hash[offset] * Math.pow(2, 32) +
        hash[offset + 1] * Math.pow(2, 24) +
        hash[offset + 2] * Math.pow(2, 16) +
        hash[offset + 3] * Math.pow(2, 8) +
        hash[offset + 4]) % 100000;
    let s = chunk.toString();
    while (s.length < 5) {
        s = '0' + s;
    }
    return s;
}

async function GetDisplayStringFor(identifier: Uint8Array, key: Uint8Array, iterations: number): Promise<string> {
    let bytes = Buffer.concat([
        ShortToArrayBuffer(VERSION), key, identifier
    ]);
    return IterateHash(bytes, key, iterations).then(output => {
        return GetEncodedChunk(output, 0) +
            GetEncodedChunk(output, 5) +
            GetEncodedChunk(output, 10) +
            GetEncodedChunk(output, 15) +
            GetEncodedChunk(output, 20) +
            GetEncodedChunk(output, 25);
    });
}

export class FingerprintGenerator {

    constructor(iterations: number) {
        this._iterations = iterations;
    }

    private _iterations: number;

    async createFor(localIdentifier: Uint8Array, localIdentityKey: Uint8Array,
                    remoteIdentifier: Uint8Array, remoteIdentityKey: Uint8Array): Promise<string> {
        return Promise.all([
            GetDisplayStringFor(localIdentifier, localIdentityKey, this._iterations),
            GetDisplayStringFor(remoteIdentifier, remoteIdentityKey, this._iterations)
        ]).then(fingerprints => {
            return fingerprints.sort().join('');
        });
    }
}