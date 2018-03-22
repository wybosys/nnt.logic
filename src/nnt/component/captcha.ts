let captcha = require("trek-captcha");

export interface Captcha {
    token: string;
    buffer: Buffer;
}

export async function Generate(): Promise<Captcha> {
    const {token, buffer} = await captcha();
    return {token: token, buffer: buffer};
}