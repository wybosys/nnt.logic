
// 保留小数，避免有效位截断导致的误差
export function Decimal(input:number, digit:number):number {
    if (digit == 0)
        return input >> 0;
    return ((input * 10 * digit) >> 0) / (10 * digit);
}