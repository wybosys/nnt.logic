declare module 'time' {

    class DateExt extends Date {
        setTimezone(tz: string): void;

        getTimezone(): string;
    }

    export = DateExt;
}