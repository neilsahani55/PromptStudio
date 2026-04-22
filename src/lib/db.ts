import { createClient, type Client, type InArgs, type InValue } from '@libsql/client';
import bcryptjs from 'bcryptjs';

// ─── Client bootstrap ───────────────────────────────────────────────────────
// - Production: set TURSO_DATABASE_URL to libsql://... and TURSO_AUTH_TOKEN.
// - Local dev: leave both blank to use an embedded SQLite file at data/promptstudio.db.
const url = process.env.TURSO_DATABASE_URL || 'file:data/promptstudio.db';
const authToken = process.env.TURSO_AUTH_TOKEN;

const client: Client = createClient({ url, authToken });

// ─── Lazy schema init ───────────────────────────────────────────────────────
// libSQL is async so we cannot run CREATE TABLE at module load. Instead we
// memoize an init promise and every query helper awaits it before executing.
let initPromise: Promise<void> | null = null;

async function init(): Promise<void> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    // Schema
    await client.batch(
      [
        `CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          role TEXT DEFAULT 'user',
          status TEXT DEFAULT 'active' CHECK(status IN ('active', 'blocked')),
          avatar_url TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          last_login TEXT
        )`,
        `CREATE TABLE IF NOT EXISTS feedback (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          type TEXT NOT NULL CHECK(type IN ('bug', 'suggestion', 'improvement')),
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          status TEXT DEFAULT 'new' CHECK(status IN ('new', 'reviewing', 'resolved', 'dismissed')),
          admin_note TEXT,
          created_at TEXT DEFAULT (datetime('now'))
        )`,
        `CREATE TABLE IF NOT EXISTS activity_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          action TEXT NOT NULL,
          details TEXT,
          ip_address TEXT,
          created_at TEXT DEFAULT (datetime('now'))
        )`,
        `CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TEXT DEFAULT (datetime('now'))
        )`,
        `CREATE TABLE IF NOT EXISTS usage_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
          model TEXT NOT NULL,
          input_type TEXT DEFAULT 'text',
          duration_ms INTEGER DEFAULT 0,
          created_at TEXT DEFAULT (datetime('now'))
        )`,
      ],
      'write'
    );

    // Idempotent migrations (add column if missing)
    for (const [table, column, spec] of [
      ['users', 'status', "TEXT DEFAULT 'active'"],
      ['feedback', 'admin_responded_at', 'TEXT'],
      ['feedback', 'user_viewed_at', 'TEXT'],
    ] as const) {
      try {
        await client.execute(`SELECT ${column} FROM ${table} LIMIT 1`);
      } catch {
        await client.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${spec}`);
      }
    }

    await seedSettings();
    await seedAdmin();
  })();
  return initPromise;
}

async function seedSettings(): Promise<void> {
  const defaults: Record<string, string> = {
    rate_limit_max: '20',
    rate_limit_window_minutes: '60',
    min_password_length: '6',
    maintenance_mode: 'false',
    maintenance_message: '',
    default_model: 'googleai/gemini-2.5-flash',
    allow_registration: 'true',
    announcement_active: 'false',
    announcement_text: '',
    announcement_type: 'info',
  };
  for (const [key, value] of Object.entries(defaults)) {
    await client.execute({
      sql: 'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)',
      args: [key, value],
    });
  }
}

async function seedAdmin(): Promise<void> {
  const countRes = await client.execute('SELECT COUNT(*) AS count FROM users');
  const count = Number((countRes.rows[0] as unknown as { count: number | bigint })?.count ?? 0);
  if (count === 0) {
    const hash = bcryptjs.hashSync('Admin@123', 10);
    await client.execute({
      sql: 'INSERT INTO users (name, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?)',
      args: ['Admin', 'admin@promptstudio.ai', hash, 'admin', 'active'],
    });
    // eslint-disable-next-line no-console
    console.log('Default admin user created: admin@promptstudio.ai');
  }
}

// ─── Query helpers ──────────────────────────────────────────────────────────
// Thin adapter so API routes read cleanly instead of repeating
// `await client.execute({sql,args})` everywhere.

export async function queryRows<T>(sql: string, ...args: InValue[]): Promise<T[]> {
  await init();
  const result = await client.execute({ sql, args });
  return result.rows as unknown as T[];
}

export async function queryRow<T>(
  sql: string,
  ...args: InValue[]
): Promise<T | null> {
  const rows = await queryRows<T>(sql, ...args);
  return rows[0] ?? null;
}

export async function exec(
  sql: string,
  ...args: InValue[]
): Promise<{ changes: number; lastInsertRowid: bigint | undefined }> {
  await init();
  const result = await client.execute({ sql, args });
  return {
    changes: Number(result.rowsAffected),
    lastInsertRowid: result.lastInsertRowid,
  };
}

// Escape hatch for dynamic queries that can't fit the helpers above.
export async function execute(sql: string, args: InArgs = []) {
  await init();
  return client.execute({ sql, args });
}

// Convenience for the rare callers that still want the raw client.
export async function getClient(): Promise<Client> {
  await init();
  return client;
}

// Back-compat: the old default export exposed better-sqlite3's sync API.
// Importing `db` now returns the helpers instead.
const db = { queryRows, queryRow, exec, execute, getClient };
export default db;
