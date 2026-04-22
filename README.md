# PromptStudio

An AI-powered prompt-generation studio that turns blog posts, screenshots, or any text content into platform-optimized image prompts for **Midjourney v6**, **DALL-E 3**, **Stable Diffusion XL**, and **Flux** — with in-app image generation for Flux and Stable Diffusion 3.5.

Built with Next.js 15, React 19, Google Genkit, and NVIDIA NIM.

---

## Features

- **Semantic text-to-prompt** — understands topic, tone, and context (not keyword extraction)
- **Screenshot enhancement** — analyses UI screenshots and preserves their layout while upgrading the visual style
- **Multi-model backend** — Google Gemini 2.5 Flash (default), plus DeepSeek V3.2, Qwen 3.5, GLM 4.7, Kimi K2, GPT-OSS 120B via NVIDIA NIM
- **In-app image generation** — direct Flux and Stable Diffusion 3.5 output from the UI
- **Quality scoring** — every prompt scored on completeness, specificity, coherence, length; de-vagueness pass removes filler words; style conflicts auto-resolved
- **10-theme UI** — Light, Dark, Ocean Blue, Forest Green, Sunset, Rose, Midnight, Lavender, Charcoal, Emerald; logo, avatars, buttons, and admin panel all recolour automatically
- **Local-first history** — every generation is saved to your browser with search, tags, favourites
- **Auth + admin panel** — JWT login, user management, usage analytics, feedback triage with bidirectional notifications

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15.5 (App Router, Turbopack) |
| UI | React 19, TailwindCSS 3.4, shadcn/ui (Radix primitives) |
| AI orchestration | Google Genkit 1.20 |
| Models | Gemini 2.5 Flash, NVIDIA NIM-hosted OpenAI-compatible models |
| Auth | JWT (`jose`), bcryptjs password hashing, middleware-guarded routes |
| Database | SQLite via `better-sqlite3` (local, file-based) |
| Validation | Zod |

---

## Quick start

```bash
# 1. Clone and install
git clone https://github.com/<you>/promptstudio.git
cd promptstudio
npm install

# 2. Configure environment
cp .env.example .env.local
# then edit .env.local — at minimum set AUTH_SECRET and GOOGLE_GENAI_API_KEY

# 3. Run
npm run dev
```

Open http://localhost:9080

**First-run seed**: the SQLite database is auto-created at `data/promptstudio.db` on first boot. A default admin account is seeded:

- Email: `admin@promptstudio.ai`
- Password: `Admin@123`

**Change this immediately** from the admin panel at `/admin/users`.

---

## Environment variables

See [`.env.example`](.env.example) for the complete template.

| Variable | Required | Purpose |
|---|:---:|---|
| `AUTH_SECRET` | yes | Signs JWT session cookies. Generate with `node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"` |
| `GOOGLE_GENAI_API_KEY` | yes | Gemini 2.5 Flash (default model). [Get one](https://aistudio.google.com/apikey) |
| `NVIDIA_API_KEY` |  | Unlocks DeepSeek / Qwen / GLM / Kimi / GPT-OSS. [Get one](https://build.nvidia.com/) |
| `NVIDIA_API_KEY_FLUX` |  | In-app Flux image generation |
| `NVIDIA_API_KEY_SD35` |  | In-app Stable Diffusion 3.5 image generation |
| `NVIDIA_NIM_BASE_URL` |  | Defaults to `https://integrate.api.nvidia.com/v1` |
| `ALLOWED_DEV_ORIGINS` |  | Comma-separated LAN origins for Turbopack dev server |

The app runs with only `AUTH_SECRET` + `GOOGLE_GENAI_API_KEY`. Everything else is opt-in.

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
├── data/                       # SQLite database + prompt feedback log (gitignored)
├── docs/                       # PROJECT_DOCUMENTATION.md + .pdf (full technical reference)
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
│   │   ├── feedback/           # User-facing feedback history
│   │   ├── login/, register/, settings/
│   │   ├── layout.tsx, page.tsx
│   │   └── globals.css         # 10 theme CSS-variable blocks
│   ├── components/
│   │   ├── ui/                 # shadcn primitives
│   │   ├── logo.tsx            # Theme-aware SVG logo
│   │   ├── theme-provider.tsx, theme-palette.tsx
│   │   └── ...
│   ├── hooks/                  # use-history, use-feedback-notifications, use-toast
│   ├── lib/                    # auth, db, utils, types
│   └── middleware.ts           # Route guards, JWT verification
├── .env.example                # Env template (commit this)
├── .env.local                  # Your secrets (never commit)
├── github.txt                  # Step-by-step GitHub + deploy guide
└── README.md
```

---

## Deployment

**Important**: this app writes to a local SQLite file (`data/promptstudio.db`). That rules out serverless-only platforms (Vercel, Netlify) unless you swap the database. See [`github.txt`](github.txt) for a full decision table plus step-by-step instructions for:

| Platform | SQLite works? | Setup time |
|---|:---:|---|
| **Railway** | yes — persistent volume | ~5 min |
| **Render** | yes — with disk | ~5 min |
| **Fly.io** | yes — with volume | ~10 min |
| **Vercel** + Turso (libSQL) | yes — with minor code change | ~15 min |
| **Vercel / Netlify** (vanilla) | no — SQLite file is wiped on each invocation | — |
| **Self-hosted VPS** | yes | ~10 min |

---

## Security notes

- `AUTH_SECRET` must be set in production — the insecure fallback only exists for local development and logs a warning.
- The default admin password (`Admin@123`) is seeded on the first run of an empty database. Change it immediately via `/admin/users` → Reset Password.
- API keys in `.env.local` should be rotated if you ever suspect they've been shared. NVIDIA and Google AI Studio both let you revoke individual keys.
- The app uses JWT session cookies (`httpOnly`, `sameSite=lax`). Sessions expire after 7 days.
- Rate limiting is per-user (20 generations/hour by default); configurable via `/admin/settings`.

---

## License

MIT. Replace this line with your own license if you prefer.

---

## Contributing

Issues and pull requests welcome. See [`github.txt`](github.txt) for the full contribution workflow.
