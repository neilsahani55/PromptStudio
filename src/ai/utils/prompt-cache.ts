/**
 * In-memory prompt cache with TTL
 * Prevents redundant AI calls for identical/similar inputs
 */

import crypto from 'crypto';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  hitCount: number;
}

const DEFAULT_TTL_MS = 60 * 60 * 1000; // 1 hour
const MAX_ENTRIES = 200;

class PromptCache<T = any> {
  private cache = new Map<string, CacheEntry<T>>();
  private ttl: number;

  constructor(ttlMs = DEFAULT_TTL_MS) {
    this.ttl = ttlMs;
  }

  /**
   * Generate a cache key from input parameters.
   * Uses MD5 hash of serialized inputs for consistent, compact keys.
   */
  static makeKey(...parts: (string | undefined | null)[]): string {
    const raw = parts.filter(Boolean).join('|');
    return crypto.createHash('md5').update(raw).digest('hex');
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check TTL
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    entry.hitCount++;
    return entry.data;
  }

  set(key: string, data: T): void {
    // Evict oldest entries if at capacity
    if (this.cache.size >= MAX_ENTRIES) {
      const oldest = [...this.cache.entries()]
        .sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
      if (oldest) this.cache.delete(oldest[0]);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      hitCount: 0,
    });
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }

  /** Get cache stats for debugging */
  stats(): { size: number; totalHits: number } {
    let totalHits = 0;
    for (const entry of this.cache.values()) {
      totalHits += entry.hitCount;
    }
    return { size: this.cache.size, totalHits };
  }
}

// Singleton caches for different purposes
export const textPromptCache = new PromptCache(DEFAULT_TTL_MS);
export const screenshotPromptCache = new PromptCache(DEFAULT_TTL_MS);

export { PromptCache };
