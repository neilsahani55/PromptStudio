# PromptStudio

An AI-powered prompt-generation studio that turns blog posts, screenshots, or any text content into platform-optimized image prompts for **Midjourney v6**, **DALL-E 3**, **Stable Diffusion**, and **Flux** — with a built-in **Media Studio** that generates images across up to 4 AI models at once and videos across 2, so you always pick the best result.

Built with Next.js 15, React 19, Google Genkit, Supabase, NVIDIA NIM, Cloudflare Workers AI, and Hugging Face Inference Providers.

**Live:** https://promptstudios.vercel.app · Built by **Neel Sahani** · Contact: promptstudio55@gmail.com

---

## Features

- **Semantic text-to-prompt** — understands topic, tone, and context (not keyword extraction)
- **Screenshot enhancement** — analyses UI screenshots and preserves their layout while upgrading the visual style
- **Media Studio** — generate one prompt on up to **4 image models at once** (NVIDIA FLUX.2 Klein / FLUX.1 Dev, Cloudflare FLUX Schnell / SDXL Lightning / SDXL / DreamShaper, HF FLUX Schnell / SDXL / Qwen-Image) and pick the best
- **Video generation** — the master prompt is auto-adapted with motion + camera language, then rendered with **Wan 2.2** or **HunyuanVideo**
- **Bring your own keys (BYOK)** — users add their own Hugging Face / NVIDIA / OpenAI / Gemini / DeepSeek / Ollama keys in Settings; keys are live-verified before saving and stored encrypted (AES-256-GCM)
- **Daily credits** — 10 free credits per user per day (image 1, video 2), UTC reset, automatic refund when a provider fails; admins unlimited
- **Google sign-in** — verified-email accounts only (open email registration is disabled); configurable admin allowlist
- **Cloud gallery** — every generated image saved to an account-synced gallery (Vercel Blob), plus prompt history with generated-image thumbnails
- **Quality scoring** — every prompt scored on completeness, specificity, coherence, length; de-vagueness pass removes filler words
- **10-theme UI** — logo, avatars, buttons, and admin panel all recolour automatically
- **Admin panel + email alerts** — user management, usage analytics, feedback triage with SMTP notifications to your inbox

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15.5 (App Router, Turbopack) |
| UI | React 19, TailwindCSS 3.4, shadcn/ui (Radix primitives) |
| AI orchestration | Google Genkit 1.20 |
| Models | Gemini 2.5 Flash, NVIDIA NIM-hosted OpenAI-compatible models |
| Auth | Google OAuth (primary) + JWT (`jose`) sessions, middleware-guarded routes |
| Database | [Supabase](https://supabase.com) Postgres (free tier) |
| Media providers | NVIDIA NIM · Cloudflare Workers AI · Hugging Face Inference Providers (Together/fal) |
| Storage | Vercel Blob (cloud image gallery) |
| Email | Nodemailer + Gmail SMTP (feedback notifications) |
| Validation | Zod |

### Routes

| Path | Access | Purpose |
|---|---|---|
| `/` | Public | Marketing landing page |
| `/studio` | Authenticated | The prompt-generation studio (the app) |
| `/login`, `/register` | Public | Auth |
| `/settings`, `/feedback` | Authenticated | User settings & feedback history |
| `/admin/*` | Admin only | User management, feedback triage, usage, settings |

---

## Quick start

```bash
# 1. Clone and install
git clone https://github.com/<you>/promptstudio.git
cd promptstudio
npm install

# 2. Configure environment
cp .env.example .env.local
# then edit .env.local — set AUTH_SECRET, GOOGLE_GENAI_API_KEY, SUPABASE_DB_URL

# 3. Run
npm run dev
```

Open http://localhost:9080

**First-run seed**: tables are auto-created in your Supabase database on first boot. A default admin account is seeded:

- Email: `admin@promptstudio.ai`
- Password: `Admin@123`

**Change this immediately** from the admin panel at `/admin/users`.

---

## Environment variables

See [`.env.example`](.env.example) for the template and **[`ENVIRONMENT.md`](ENVIRONMENT.md) for the full setup guide** (local + Vercel).

| Variable | Required | Purpose |
|---|:---:|---|
| `AUTH_SECRET` | yes | Signs JWT session cookies. Generate with `node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"` |
| `GOOGLE_GENAI_API_KEY` | yes | Gemini 2.5 Flash (default model). [Get one](https://aistudio.google.com/apikey) |
| `NVIDIA_API_KEY` |  | Unlocks DeepSeek / Qwen / GLM / Kimi / GPT-OSS. [Get one](https://build.nvidia.com/) |
| `NVIDIA_API_KEY_FLUX` |  | In-app Flux image generation |
| `NVIDIA_API_KEY_SD35` |  | In-app Stable Diffusion 3.5 image generation |
| `NVIDIA_NIM_BASE_URL` |  | Defaults to `https://integrate.api.nvidia.com/v1` |
| `SUPABASE_DB_URL` | yes | Supabase Postgres connection string (Transaction pooler URI). [Sign up free](https://supabase.com) |
| `ALLOWED_DEV_ORIGINS` |  | Comma-separated LAN origins for Turbopack dev server |

The app needs `AUTH_SECRET`, `GOOGLE_GENAI_API_KEY`, and `SUPABASE_DB_URL`. Everything else is opt-in.

---

## Available scripts

```bash
npm run dev          # Dev server on :9080 with Turbopack + hot reload
npm run genkit:dev   # Genkit Developer UI (inspect AI flows)
npm run build        # Production build
npm run start        # Serve the production build (default port 3000)
npm run typecheck    # tsc --noEmit (no output = pass)
npm run lint         # next lint
```

---

## Project layout

```
.
├── public/                     # Static assets
├── src/
│   ├── ai/
│   │   ├── flows/              # Genkit flows (text → prompts, screenshot → prompts, generate image)
│   │   ├── utils/              # Quality scorer, theme engine, sanitizers, formatters
│   │   ├── genkit.ts           # Genkit + model plugin config
│   │   └── dev.ts              # Genkit CLI entry
│   ├── app/
│   │   ├── admin/              # Admin panel (users, feedback, settings, usage, stats)
│   │   ├── api/                # Auth, feedback, admin, image-gen routes
│   │   ├── studio/             # The prompt-generation studio (authenticated app, /studio)
│   │   ├── feedback/           # User-facing feedback history
│   │   ├── login/, register/, settings/
│   │   ├── layout.tsx          # Root layout (theme + auth providers)
│   │   ├── page.tsx            # Public marketing landing page (/)
│   │   └── globals.css         # 10 theme CSS-variable blocks
│   ├── components/
│   │   ├── ui/                 # shadcn primitives
│   │   ├── logo.tsx            # Theme-aware SVG logo
│   │   ├── theme-provider.tsx, theme-palette.tsx
│   │   └── ...
│   ├── hooks/                  # use-history, use-feedback-notifications, use-toast
│   ├── lib/                    # auth, db (Supabase Postgres), utils, types
│   └── middleware.ts           # Route guards, JWT verification
├── .env.example                # Env template (commit this)
├── .env.local                  # Your secrets (never commit)
└── README.md
```

---

## Deployment

The database is **Supabase Postgres** — serverless-friendly on every platform:

1. Create a free project at [supabase.com](https://supabase.com).
2. Set `SUPABASE_DB_URL` (Project Settings → Database → Connection string → **Transaction pooler** URI, port 6543) in your host's environment.
3. Set `AUTH_SECRET` and `GOOGLE_GENAI_API_KEY` (plus any optional NVIDIA keys).
4. Deploy. The schema and default admin are created automatically on first boot.

| Platform | Works? | Notes |
|---|:---:|---|
| **Vercel** + Supabase | yes | Recommended — zero-config serverless + Postgres |
| **Netlify** + Supabase | yes | Same approach as Vercel |
| **Railway / Render / Fly.io** | yes | Same Supabase connection string |
| **Self-hosted VPS** | yes | Same Supabase connection string |

---

## Security notes

- `AUTH_SECRET` must be set in production — the insecure fallback only exists for local development and logs a warning.
- The default admin password (`Admin@123`) is seeded on the first run of an empty database. Change it immediately via `/admin/users` → Reset Password.
- API keys in `.env.local` should be rotated if you ever suspect they've been shared. NVIDIA and Google AI Studio both let you revoke individual keys.
- The app uses JWT session cookies (`httpOnly`, `sameSite=lax`). Sessions expire after 7 days.
- Rate limiting is per-user (20 generations/hour by default); configurable via `/admin/settings`.

---

## About & Contact

**PromptStudio** is built and maintained by **Neel Sahani**.

- 📧 Contact: [promptstudio55@gmail.com](mailto:promptstudio55@gmail.com)
- 🌐 Live app: https://promptstudios.vercel.app
- 💬 Feedback: use the in-app feedback dialog — it lands straight in the owner's inbox

---

## License

MIT. Replace this line with your own license if you prefer.

---

## Contributing

Issues and pull requests welcome. Fork the repo, create a feature branch, run `npm run typecheck` and `npm run lint` before opening a PR against `main`.
