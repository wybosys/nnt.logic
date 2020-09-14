export class Mask {

    static Set(value: number, mask: number): number {
        if (this.Has(value, mask))
            return value;
        return value | mask;
    }

    static Unset(value: number, mask: number): number {
        if (!this.Has(value, mask))
            return value;
        return value ^ mask;
    }

    static Has(value: number, mask: number): boolean {
        return (value & mask) == mask;
    }
}
