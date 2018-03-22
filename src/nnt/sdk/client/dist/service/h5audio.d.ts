import { AudioRecorder } from "../service";
import { IMedia } from "../media";
export declare class H5AudioRecorder extends AudioRecorder {
    private static _VALID;
    static IsValid(cb: (support: boolean) => void): boolean;
    bufferlen: number;
    channels: number;
    protected _ctx: AudioContext;
    protected _recorder: Worker;
    protected _player: HTMLAudioElement;
    protected _data: Blob;
    start(cb?: (err: Error) => void): void;
    stop(cb?: (media?: IMedia) => void): void;
    play(cb?: (err: Error) => void): void;
    protected doStart(stream: MediaStream, cb: (err: Error) => void): void;
    private _cbStopped;
    sampleRate: number;
    bitRate: number;
    protected doStop(cb: (media: IMedia) => void): void;
}
