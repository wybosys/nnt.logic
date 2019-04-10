export interface ISafeMap<K, V> extends Map<K, V> {

    get(k: K, def?: V): V;
}

export class MapNumber<K> extends Map<K, number> implements ISafeMap<K, number> {

    get(k: K, def: number = 0): number {
        if (this.has(k))
            return super.get(k);
        return def;
    }
}

export class MapString<K> extends Map<K, string> implements ISafeMap<K, string> {

    get(k: K, def: string = ''): string {
        if (this.has(k))
            return super.get(k);
        return def;
    }
}
