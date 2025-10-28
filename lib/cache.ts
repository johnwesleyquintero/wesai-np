
const CACHE_STALE_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Generates a SHA-256 hash from a string.
 * @param message The string to hash.
 * @returns A hex representation of the hash.
 */
export async function sha256(message: string): Promise<string> {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

/**
 * Retrieves and validates a cache entry from localStorage.
 * @param key The cache key (hash).
 * @returns The cached data if it's not stale, otherwise null.
 */
export const getLocalCache = (key: string) => {
  try {
    const item = localStorage.getItem(key);
    if (!item) return null;

    const cache = JSON.parse(item);
    if (Date.now() - cache.timestamp > CACHE_STALE_MS) {
      localStorage.removeItem(key);
      return null;
    }
    return cache.data;
  } catch (e) {
    // If parsing fails, treat it as a cache miss.
    return null;
  }
};

/**
 * Saves data to localStorage with a timestamp.
 * @param key The cache key (hash).
 * @param data The data to store.
 */
export const setLocalCache = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify({
      data,
      timestamp: Date.now(),
    }));
  } catch (e) {
    console.error("Failed to set local cache", e);
  }
};
