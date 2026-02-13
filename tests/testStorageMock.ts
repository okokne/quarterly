type MockStorage = Storage & {
    __store: Map<string, string>;
};

export function installMockStorage(): {
    storage: MockStorage;
    restore: () => void;
} {
    const original = (globalThis as unknown as { localStorage?: Storage }).localStorage;
    const store = new Map<string, string>();

    const storage: MockStorage = {
        __store: store,
        get length() {
            return store.size;
        },
        clear() {
            store.clear();
        },
        getItem(key: string) {
            return store.has(key) ? (store.get(key) ?? null) : null;
        },
        key(index: number) {
            const keys = Array.from(store.keys());
            return keys[index] ?? null;
        },
        removeItem(key: string) {
            store.delete(key);
        },
        setItem(key: string, value: string) {
            store.set(key, String(value));
        }
    };

    (globalThis as unknown as { localStorage?: Storage }).localStorage = storage;

    return {
        storage,
        restore: () => {
            if (original) {
                (globalThis as unknown as { localStorage?: Storage }).localStorage = original;
                return;
            }
            delete (globalThis as unknown as { localStorage?: Storage }).localStorage;
        }
    };
}
