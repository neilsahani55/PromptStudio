import { queryRow, queryRows, exec } from './db';

// In-memory cache with TTL
const cache = new Map<string, { value: string; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function getSetting(key: string): Promise<string> {
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const row = await queryRow<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    key
  );

  const value = row?.value ?? '';
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  return value;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await exec(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    key,
    value
  );

  // Invalidate caches
  cache.delete(key);
  allSettingsCache = null;
}

// Cache for getAllSettings bulk reads
let allSettingsCache:
  | { data: Record<string, string>; expiresAt: number }
  | null = null;

export async function getAllSettings(): Promise<Record<string, string>> {
  if (allSettingsCache && allSettingsCache.expiresAt > Date.now()) {
    return { ...allSettingsCache.data };
  }

  const rows = await queryRows<{ key: string; value: string }>(
    'SELECT key, value FROM settings'
  );

  const result: Record<string, string> = {};
  for (const row of rows) {
    result[row.key] = row.value;
    cache.set(row.key, {
      value: row.value,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
  }

  allSettingsCache = { data: { ...result }, expiresAt: Date.now() + CACHE_TTL_MS };
  return result;
}

export async function getSettingNumber(
  key: string,
  fallback: number
): Promise<number> {
  const val = await getSetting(key);
  const num = parseInt(val, 10);
  return isNaN(num) ? fallback : num;
}

export async function getSettingBool(key: string): Promise<boolean> {
  return (await getSetting(key)) === 'true';
}
