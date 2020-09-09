// signal-protocol

export class WhisperMessage {
    ephemeralKey: Uint8Array;
    counter: number;
    previousCounter: number;
    ciphertext: Uint8Array;
}

export class PreKeyWhisperMessage {
    registrationId: number;
    preKeyId: number;
    signedPreKeyId: number;
    baseKey: Uint8Array;
    identityKey: Uint8Array;
    message: Uint8Array;
}

export class KeyExchangeMessage {
    id: number;
    baseKey: Uint8Array;
    ephemeralKey: Uint8Array;
    identityKey: Uint8Array;
    baseKeySignature: Uint8Array;
}