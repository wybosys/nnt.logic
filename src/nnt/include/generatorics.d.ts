declare module "generatorics" {
    function permutation<T>(arr: T[], m: number): Generator<T[]>;

    function combination<T>(arr: T[], m: number): Generator<T[]>;
}