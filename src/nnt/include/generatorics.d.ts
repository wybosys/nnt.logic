declare module "generatorics" {
    function permutation<T>(arr: T[], m: number): Generator;

    function combination<T>(arr: T[], m: number): Generator;
}