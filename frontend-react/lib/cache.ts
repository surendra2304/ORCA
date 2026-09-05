const memoryCache: Record<string, any> = {};

export function getCached<T>(key: string): T | null {
  if (memoryCache[key]) return memoryCache[key] as T;
  try {
    const s = sessionStorage.getItem(`kaligan_${key}`);
    if (s) {
      const parsed = JSON.parse(s);
      memoryCache[key] = parsed;
      return parsed as T;
    }
  } catch (e) {
    // Ignore parse errors
  }
  return null;
}

export function setCached<T>(key: string, data: T): void {
  memoryCache[key] = data;
  try {
    sessionStorage.setItem(`kaligan_${key}`, JSON.stringify(data));
  } catch (e) {
    // Ignore storage errors (quota exceeded, etc.)
  }
}

export function invalidateCached(key: string): void {
  delete memoryCache[key];
  try {
    sessionStorage.removeItem(`kaligan_${key}`);
  } catch (e) {}
}
