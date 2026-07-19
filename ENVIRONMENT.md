# Environment Variables — Setup Guide

This is the single source of truth for configuring PromptStudio. Keep it in
sync with [`.env.example`](.env.example) and [`src/lib/env.ts`](src/lib/env.ts).

On server startup the app logs a one-line config summary and **warns** (never
crashes) if a required variable is missing — check your terminal / Vercel logs
if something isn't working.

---

## The complete variable list

| Variable | Required? | Purpose | Where to get it |
|---|---|---|---|
| `AUTH_SECRET` | **Prod** (dev has insecure fallback) | Signs JWT session cookies | `node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"` |
| `GOOGLE_GENAI_API_KEY` | **Always** | Default Gemini 2.5 Flash model | https://aistudio.google.com/apikey |
| `SUPABASE_DB_URL` | **Always** | Supabase Postgres connection string (Transaction pooler URI, port 6543) | https://supabase.com → Project Settings → Database |
| `NVIDIA_API_KEY` | Optional | Extra text models **and** image generation | https://build.nvidia.com/ |
| `NVIDIA_API_KEY_FALLBACK` | Optional | 2nd key, auto-used if the primary is rate-limited | build.nvidia.com (another account) |
| `NVIDIA_NIM_BASE_URL` | Optional | NVIDIA text endpoint (default is fine) | — |
| `NVIDIA_FLUX_URL` | Optional | Override Flux image endpoint | — |
| `NVIDIA_SD_URL` | Optional | Override SD image endpoint | — |
| `ALLOWED_DEV_ORIGINS` | Optional | LAN origins for the dev server | — |
| `CLOUDFLARE_ACCOUNT_ID` | Optional | +4 free image models via Workers AI (~10k neurons/day free) | https://dash.cloudflare.com (right sidebar) |
| `CLOUDFLARE_API_TOKEN` | Optional | Token with the "Workers AI" permission | Cloudflare → My Profile → API Tokens → "Workers AI" template |
| `HF_TOKEN` | Optional | +2 image models and **video generation (beta)** via the HF router; small free monthly credits | https://huggingface.co/settings/tokens |
| `BLOB_READ_WRITE_TOKEN` | Optional | Cross-device image gallery (Vercel Blob) | Vercel → Storage → Blob → Connect project |
| `GOOGLE_CLIENT_ID` | **Prod** | Google sign-in (primary login; verified emails only) | Google Cloud Console → APIs & Services → Credentials → OAuth client ID (Web) |
| `GOOGLE_CLIENT_SECRET` | **Prod** | Google sign-in client secret | Same OAuth client |
| `ADMIN_EMAILS` | Optional | Comma-separated emails auto-promoted to admin on Google sign-in (default: project owner) | — |

**Minimum to run:** `AUTH_SECRET` + `GOOGLE_GENAI_API_KEY`. Everything else is
opt-in — but the database now requires `SUPABASE_DB_URL` (Supabase's free tier works for dev and prod).

---

## Local setup

```bash
cp .env.example .env.local
# edit .env.local — at minimum set AUTH_SECRET and GOOGLE_GENAI_API_KEY
npm install
npm run dev            # http://localhost:9080
```

- `.env.local` is git-ignored (`.env*`) — never commit it.
- Set `SUPABASE_DB_URL` locally too (same Supabase project or a second free one). Tables auto-create on first boot.
- First run seeds an admin: `admin@promptstudio.ai` / `Admin@123` → change it in `/admin/users`.

---

## Vercel (production) setup

Project → **Settings → Environment Variables**. Add each for **Production**
(and Preview/Development if you want):

**Required**
```
AUTH_SECRET             = <48-byte base64 string>
GOOGLE_GENAI_API_KEY    = <your Gemini key>
SUPABASE_DB_URL         = postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres
```

**Optional (for NVIDIA models + image generation)**
```
NVIDIA_API_KEY          = <your NVIDIA key>
NVIDIA_API_KEY_FALLBACK = <optional 2nd key>
```

After changing variables, **redeploy** (Vercel does not apply env changes to a
running deployment).

> **Migration note:** `NVIDIA_API_KEY_FLUX` and `NVIDIA_API_KEY_SD35` are no
> longer used — one `NVIDIA_API_KEY` now powers text + image. You can delete
> those two old variables from Vercel.

---

## Rules of thumb (so it doesn't fail later)

1. **Same names, everywhere.** Local `.env.local`, Vercel, and any other host
   must use the exact variable names in the table above.
2. **No quotes, no spaces** around `=` in `.env.local` (`KEY=value`, not `KEY = "value"`).
3. **Rotate keys if they leak.** NVIDIA and Google let you revoke individual keys.
4. **The DB is Supabase Postgres everywhere.** Use the Transaction pooler URI
   (port 6543) — it is the serverless-safe connection string.
5. **Redeploy after env changes** on Vercel.
6. **Check the startup log.** `[env] Config: …` shows what's active; `[env] ⚠ Missing …`
   flags problems.
