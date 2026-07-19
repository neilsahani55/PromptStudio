import crypto from 'crypto';
import { queryRow, queryRows, exec } from './db';

/**
 * BYOK — user-supplied API keys, stored AES-256-GCM encrypted (key derived
 * from AUTH_SECRET). Each provider has a cheap validation call so users can
 * verify a key works before saving. Keys are used to:
 *  - generate media on the user's own quota (huggingface / nvidia)
 *  - power the Enhance + video-prompt features via the user's own LLM
 *    (openai / gemini / deepseek / ollama / custom OpenAI-compatible)
 */

export const KEY_PROVIDERS = [
  'openai',
  'gemini',
  'deepseek',
  'huggingface',
  'nvidia',
  'ollama',
  'custom',
] as const;
export type KeyProvider = (typeof KEY_PROVIDERS)[number];

export interface UserKeyInfo {
  provider: KeyProvider;
  masked: string;
  base_url: string | null;
  model: string | null;
  created_at: string;
}

// ─── Encryption ─────────────────────────────────────────────────────────────
const ENC_KEY = crypto
  .createHash('sha256')
  .update(process.env.AUTH_SECRET || 'promptstudio-default-secret-change-in-production')
  .digest();

function encrypt(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENC_KEY, iv);
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return [iv.toString('base64'), cipher.getAuthTag().toString('base64'), ct.toString('base64')].join('.');
}

function decrypt(stored: string): string | null {
  try {
    const [ivB64, tagB64, ctB64] = stored.split('.');
    const decipher = crypto.createDecipheriv('aes-256-gcm', ENC_KEY, Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(ctB64, 'base64')), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
}

const mask = (key: string) => (key.length <= 8 ? '••••' : `${key.slice(0, 4)}…${key.slice(-4)}`);

// ─── CRUD ───────────────────────────────────────────────────────────────────
export async function saveUserKey(
  userId: number,
  provider: KeyProvider,
  apiKey: string,
  baseUrl?: string | null,
  model?: string | null
): Promise<void> {
  await exec(
    `INSERT INTO user_api_keys (user_id, user_name, provider, api_key, base_url, model)
     VALUES (?, (SELECT name FROM users WHERE id = ?), ?, ?, ?, ?)
     ON CONFLICT (user_id, provider)
     DO UPDATE SET api_key = excluded.api_key, base_url = excluded.base_url,
                   model = excluded.model, created_at = now()`,
    userId,
    userId,
    provider,
    encrypt(apiKey),
    baseUrl || null,
    model || null
  );
}

export async function getUserKey(
  userId: number,
  provider: KeyProvider
): Promise<{ apiKey: string; baseUrl: string | null; model: string | null } | null> {
  const row = await queryRow<{ api_key: string; base_url: string | null; model: string | null }>(
    'SELECT api_key, base_url, model FROM user_api_keys WHERE user_id = ? AND provider = ?',
    userId,
    provider
  );
  if (!row) return null;
  const apiKey = decrypt(row.api_key);
  if (!apiKey) return null;
  return { apiKey, baseUrl: row.base_url, model: row.model };
}

export async function listUserKeys(userId: number): Promise<UserKeyInfo[]> {
  const rows = await queryRows<{ provider: KeyProvider; api_key: string; base_url: string | null; model: string | null; created_at: string }>(
    'SELECT provider, api_key, base_url, model, created_at FROM user_api_keys WHERE user_id = ? ORDER BY provider',
    userId
  );
  return rows.map((r) => ({
    provider: r.provider,
    masked: mask(decrypt(r.api_key) || ''),
    base_url: r.base_url,
    model: r.model,
    created_at: r.created_at,
  }));
}

export async function deleteUserKey(userId: number, provider: KeyProvider): Promise<void> {
  await exec('DELETE FROM user_api_keys WHERE user_id = ? AND provider = ?', userId, provider);
}

// ─── Validation (cheap live test per provider) ──────────────────────────────
export async function validateProviderKey(
  provider: KeyProvider,
  apiKey: string,
  baseUrl?: string | null
): Promise<{ ok: boolean; detail: string }> {
  const timeout = (ms: number) => {
    const c = new AbortController();
    setTimeout(() => c.abort(), ms);
    return c.signal;
  };
  const bearer = { Authorization: `Bearer ${apiKey}` };
  try {
    switch (provider) {
      case 'openai': {
        const r = await fetch('https://api.openai.com/v1/models', { headers: bearer, signal: timeout(15000) });
        return r.ok ? { ok: true, detail: 'OpenAI key is valid.' } : { ok: false, detail: `OpenAI rejected the key (HTTP ${r.status}).` };
      }
      case 'gemini': {
        const r = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`,
          { signal: timeout(15000) }
        );
        return r.ok ? { ok: true, detail: 'Gemini key is valid.' } : { ok: false, detail: `Google rejected the key (HTTP ${r.status}).` };
      }
      case 'deepseek': {
        const r = await fetch('https://api.deepseek.com/models', { headers: bearer, signal: timeout(15000) });
        return r.ok ? { ok: true, detail: 'DeepSeek key is valid.' } : { ok: false, detail: `DeepSeek rejected the key (HTTP ${r.status}).` };
      }
      case 'huggingface': {
        const r = await fetch('https://huggingface.co/api/whoami-v2', { headers: bearer, signal: timeout(15000) });
        if (!r.ok) return { ok: false, detail: `Hugging Face rejected the token (HTTP ${r.status}).` };
        const who: any = await r.json();
        return { ok: true, detail: `Hugging Face token valid (account: ${who?.name || 'ok'}).` };
      }
      case 'nvidia': {
        const r = await fetch('https://integrate.api.nvidia.com/v1/models', { headers: bearer, signal: timeout(15000) });
        return r.ok ? { ok: true, detail: 'NVIDIA key is valid.' } : { ok: false, detail: `NVIDIA rejected the key (HTTP ${r.status}).` };
      }
      case 'ollama': {
        if (!baseUrl) return { ok: false, detail: 'Ollama needs a Base URL (a publicly reachable server, e.g. https://my-ollama.example.com).' };
        const r = await fetch(`${baseUrl.replace(/\/$/, '')}/api/tags`, { signal: timeout(15000) });
        return r.ok ? { ok: true, detail: 'Ollama server reachable.' } : { ok: false, detail: `Ollama server responded HTTP ${r.status}.` };
      }
      case 'custom': {
        if (!baseUrl) return { ok: false, detail: 'Custom provider needs a Base URL (OpenAI-compatible, e.g. https://api.example.com/v1).' };
        const r = await fetch(`${baseUrl.replace(/\/$/, '')}/models`, { headers: bearer, signal: timeout(15000) });
        return r.ok ? { ok: true, detail: 'Custom endpoint reachable and key accepted.' } : { ok: false, detail: `Endpoint responded HTTP ${r.status}.` };
      }
    }
  } catch (e) {
    return { ok: false, detail: `Could not reach the provider: ${e instanceof Error ? e.message.slice(0, 80) : 'network error'}` };
  }
}

// ─── BYOK LLM completion (Enhance / video-prompt features) ──────────────────
// Tries the user's configured LLM providers in preference order and returns
// the first successful completion, or null if none are configured/working.
const LLM_ORDER: KeyProvider[] = ['gemini', 'openai', 'deepseek', 'custom', 'ollama'];
const DEFAULT_MODELS: Partial<Record<KeyProvider, string>> = {
  openai: 'gpt-4o-mini',
  deepseek: 'deepseek-chat',
  gemini: 'gemini-2.5-flash',
};

export async function completeWithUserLlm(
  userId: number,
  prompt: string
): Promise<{ text: string; provider: KeyProvider } | null> {
  for (const provider of LLM_ORDER) {
    const key = await getUserKey(userId, provider);
    if (!key) continue;
    try {
      if (provider === 'gemini') {
        const model = key.model || DEFAULT_MODELS.gemini;
        const r = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key.apiKey)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
          }
        );
        if (!r.ok) continue;
        const data: any = await r.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (text) return { text, provider };
        continue;
      }
      // OpenAI-compatible chat completions (openai / deepseek / custom / ollama)
      const base =
        provider === 'openai' ? 'https://api.openai.com/v1'
        : provider === 'deepseek' ? 'https://api.deepseek.com'
        : provider === 'ollama' ? `${(key.baseUrl || '').replace(/\/$/, '')}/v1`
        : (key.baseUrl || '').replace(/\/$/, '');
      if (!base) continue;
      const model = key.model || DEFAULT_MODELS[provider] || 'gpt-4o-mini';
      const r = await fetch(`${base}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key.apiKey}` },
        body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], max_tokens: 600 }),
      });
      if (!r.ok) continue;
      const data: any = await r.json();
      const text = data?.choices?.[0]?.message?.content?.trim();
      if (text) return { text, provider };
    } catch {
      continue;
    }
  }
  return null;
}
