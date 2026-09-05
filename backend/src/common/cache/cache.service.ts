import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  lastAccessed: number;
}

@Injectable()
export class AppCacheService implements OnModuleDestroy {
  private readonly logger = new Logger(AppCacheService.name);
  private cache = new Map<string, CacheEntry<any>>();
  private readonly maxEntries = 5000;
  private cleanupTimer: NodeJS.Timeout;

  constructor() {
    // Periodically sweep expired cache entries every 60s
    this.cleanupTimer = setInterval(() => this.purgeExpired(), 60000);
  }

  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) { this.cache.delete(key); return undefined; }
    entry.lastAccessed = Date.now();
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlSeconds: number = 60): void {
    if (this.cache.size >= this.maxEntries) this.evictLru();
    this.cache.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000, lastAccessed: Date.now() });
  }

  async getOrSet<T>(key: string, ttlSeconds: number, fetcher: () => Promise<T>): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) return cached;
    const freshValue = await fetcher();
    this.set(key, freshValue, ttlSeconds);
    return freshValue;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  deletePrefix(prefix: string): void {
    for (const key of this.cache.keys()) if (key.startsWith(prefix)) this.cache.delete(key);
  }

  private purgeExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) if (now > entry.expiresAt) this.cache.delete(key);
  }

  private evictLru(): void {
    let oldestKey: string | null = null, oldestTime = Infinity;
    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) { oldestTime = entry.lastAccessed; oldestKey = key; }
    }
    if (oldestKey) this.cache.delete(oldestKey);
  }

  onModuleDestroy() {
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
    this.cache.clear();
  }
}
