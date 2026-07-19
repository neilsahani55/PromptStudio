/**
 * Central environment-variable registry + a one-time health check.
 *
 * The goal: missing or misconfigured variables surface as a clear, early
 * warning in the server logs — instead of a silent failure deep inside a
 * request. Import `logEnvHealth()` (called once from src/ai/genkit.ts on the
 * server) or use the typed getters below.
 *
 * Keep this list in sync with `.env.example` and `ENVIRONMENT.md`.
 */

type Requirement = 'always' | 'production' | 'optional';

interface EnvSpec {
  key: string;
  requirement: Requirement;
  purpose: string;
}

export const ENV_SPECS: EnvSpec[] = [
  { key: 'AUTH_SECRET', requirement: 'production', purpose: 'Signs JWT session cookies' },
  { key: 'GOOGLE_GENAI_API_KEY', requirement: 'always', purpose: 'Default Gemini 2.5 Flash model' },
  { key: 'SUPABASE_DB_URL', requirement: 'always', purpose: 'Supabase Postgres connection string (transaction pooler)' },
  { key: 'NVIDIA_API_KEY', requirement: 'optional', purpose: 'NVIDIA text + image models' },
  { key: 'NVIDIA_API_KEY_FALLBACK', requirement: 'optional', purpose: 'Fallback NVIDIA key (rate-limit resilience)' },
  { key: 'NVIDIA_NIM_BASE_URL', requirement: 'optional', purpose: 'NVIDIA base URL override' },
  { key: 'NVIDIA_FLUX_URL', requirement: 'optional', purpose: 'Flux image endpoint override' },
  { key: 'NVIDIA_SD_URL', requirement: 'optional', purpose: 'Stable Diffusion image endpoint override' },
  { key: 'NVIDIA_QWEN_URL', requirement: 'optional', purpose: 'Qwen-Image endpoint override' },
  { key: 'CLOUDFLARE_ACCOUNT_ID', requirement: 'optional', purpose: 'Cloudflare Workers AI image models (free tier)' },
  { key: 'CLOUDFLARE_API_TOKEN', requirement: 'optional', purpose: 'Cloudflare Workers AI token (Workers AI permission)' },
  { key: 'HF_TOKEN', requirement: 'optional', purpose: 'Hugging Face router — extra image models + video (beta)' },
  { key: 'GOOGLE_CLIENT_ID', requirement: 'production', purpose: 'Google OAuth sign-in (client id)' },
  { key: 'GOOGLE_CLIENT_SECRET', requirement: 'production', purpose: 'Google OAuth sign-in (client secret)' },
  { key: 'ADMIN_EMAILS', requirement: 'optional', purpose: 'Comma-separated emails auto-promoted to admin on Google sign-in' },
  { key: 'ALLOWED_DEV_ORIGINS', requirement: 'optional', purpose: 'LAN origins for the dev server' },
];

function isSet(key: string): boolean {
  const v = process.env[key];
  return typeof v === 'string' && v.trim().length > 0;
}

/** Read a required variable, returning a fallback and warning if it is unset. */
export function requireEnv(key: string, fallback = ''): string {
  if (!isSet(key)) {
    console.warn(`[env] ${key} is not set — falling back to a default. See ENVIRONMENT.md.`);
    return fallback;
  }
  return process.env[key] as string;
}

/** Read an optional variable, returning a fallback when unset. */
export function optionalEnv(key: string, fallback = ''): string {
  return isSet(key) ? (process.env[key] as string) : fallback;
}

let alreadyLogged = false;

/**
 * Logs a one-time summary of which variables are configured. Warns loudly for
 * anything that is required in the current environment but missing. Never
 * throws — the app should degrade gracefully, not crash on boot.
 */
export function logEnvHealth(): void {
  if (alreadyLogged) return;
  alreadyLogged = true;

  const isProd = process.env.NODE_ENV === 'production';
  const missingRequired: string[] = [];

  for (const spec of ENV_SPECS) {
    const mustHave =
      spec.requirement === 'always' || (spec.requirement === 'production' && isProd);
    if (mustHave && !isSet(spec.key)) missingRequired.push(spec.key);
  }

  if (missingRequired.length > 0) {
    console.warn(
      `[env] ⚠ Missing required variable(s) for this environment: ${missingRequired.join(
        ', '
      )}. The app may not work correctly. See ENVIRONMENT.md.`
    );
  }

  const nvidiaOn = isSet('NVIDIA_API_KEY');
  const dbMode = isSet('SUPABASE_DB_URL') || isSet('DATABASE_URL') ? 'Supabase (Postgres)' : 'NOT CONFIGURED';
  console.info(
    `[env] Config: DB=${dbMode} · Gemini=${isSet('GOOGLE_GENAI_API_KEY') ? 'on' : 'OFF'} · ` +
      `NVIDIA=${nvidiaOn ? 'on' : 'off'}${isSet('NVIDIA_API_KEY_FALLBACK') ? ' (+fallback)' : ''}`
  );
}
