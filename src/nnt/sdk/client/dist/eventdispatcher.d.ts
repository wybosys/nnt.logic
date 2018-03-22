export declare class EventDispatcher {
    addListener(event: string, cb: (...args: any[]) => void): void;
    removeListener(event: string, cb: (...args: any[]) => void): void;
    raiseEvent(event: string, ...args: any[]): void;
    private _events;
}
