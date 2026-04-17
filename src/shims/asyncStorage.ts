type MultiSetEntry = [string, string];
type MultiGetEntry = [string, string | null];

const store = new Map<string, string>();

const AsyncStorage = {
  async getItem(key: string): Promise<string | null> {
    return store.has(key) ? (store.get(key) ?? null) : null;
  },
  async setItem(key: string, value: string): Promise<void> {
    store.set(key, value);
  },
  async removeItem(key: string): Promise<void> {
    store.delete(key);
  },
  async clear(): Promise<void> {
    store.clear();
  },
  async getAllKeys(): Promise<string[]> {
    return Array.from(store.keys());
  },
  async multiGet(keys: string[]): Promise<MultiGetEntry[]> {
    return keys.map((key) => [key, store.has(key) ? (store.get(key) ?? null) : null]);
  },
  async multiSet(entries: MultiSetEntry[]): Promise<void> {
    entries.forEach(([key, value]) => {
      store.set(key, value);
    });
  },
  async multiRemove(keys: string[]): Promise<void> {
    keys.forEach((key) => {
      store.delete(key);
    });
  },
};

export default AsyncStorage;
