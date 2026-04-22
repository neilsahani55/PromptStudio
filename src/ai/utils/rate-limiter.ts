/**
 * In-memory rate limiter for API abuse prevention
 * Reads configuration from admin settings (DB-backed, now async)
 */

import { getSettingNumber } from '@/lib/settings';

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const DEFAULT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const DEFAULT_MAX_REQUESTS = 20;

class RateLimiter {
  private entries = new Map<string, RateLimitEntry>();
  private defaultWindowMs: number;
  private defaultMaxRequests: number;

  constructor(windowMs = DEFAULT_WINDOW_MS, maxRequests = DEFAULT_MAX_REQUESTS) {
    this.defaultWindowMs = windowMs;
    this.defaultMaxRequests = maxRequests;
  }

  /** Read current config from admin settings (falls back to constructor defaults) */
  private async getConfig(): Promise<{ windowMs: number; maxRequests: number }> {
    try {
      const maxRequests = await getSettingNumber('rate_limit_max', this.defaultMaxRequests);
      const windowMinutes = await getSettingNumber(
        'rate_limit_window_minutes',
        this.defaultWindowMs / 60000
      );
      return { windowMs: windowMinutes * 60 * 1000, maxRequests };
    } catch {
      // Settings DB may not be available yet during startup
      return {
        windowMs: this.defaultWindowMs,
        maxRequests: this.defaultMaxRequests,
      };
    }
  }

  /**
   * Check if a request is allowed and consume one token if so.
   * Returns { allowed, remaining, resetIn }
   */
  async check(
    key: string
  ): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
    const { windowMs, maxRequests } = await this.getConfig();
    const now = Date.now();
    let entry = this.entries.get(key);

    if (entry && now - entry.windowStart > windowMs) {
      this.entries.delete(key);
      entry = undefined;
    }

    if (!entry) {
      this.entries.set(key, { count: 1, windowStart: now });
      return { allowed: true, remaining: maxRequests - 1, resetIn: windowMs };
    }

    const resetIn = windowMs - (now - entry.windowStart);

    if (entry.count >= maxRequests) {
      return { allowed: false, remaining: 0, resetIn };
    }

    entry.count++;
    return { allowed: true, remaining: maxRequests - entry.count, resetIn };
  }

  /** Get current usage without consuming a token */
  async peek(
    key: string
  ): Promise<{ used: number; remaining: number; resetIn: number }> {
    const { windowMs, maxRequests } = await this.getConfig();
    const now = Date.now();
    const entry = this.entries.get(key);

    if (!entry || now - entry.windowStart > windowMs) {
      return { used: 0, remaining: maxRequests, resetIn: windowMs };
    }

    return {
      used: entry.count,
      remaining: Math.max(0, maxRequests - entry.count),
      resetIn: windowMs - (now - entry.windowStart),
    };
  }

  /** Periodic cleanup of expired entries */
  async cleanup(): Promise<void> {
    const { windowMs } = await this.getConfig();
    const now = Date.now();
    for (const [key, entry] of this.entries) {
      if (now - entry.windowStart > windowMs) {
        this.entries.delete(key);
      }
    }
  }

  async getLimit(): Promise<number> {
    const { maxRequests } = await this.getConfig();
    return maxRequests;
  }
}

// Singleton for generation rate limiting
export const generationLimiter = new RateLimiter(DEFAULT_WINDOW_MS, DEFAULT_MAX_REQUESTS);

export { RateLimiter };
