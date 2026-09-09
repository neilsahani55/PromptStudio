/**
 * Central registry of image/video generation models across providers.
 *
 * Providers (all env-gated — a model is only exposed when its keys are set):
 *  - nvidia:     ai.api.nvidia.com genai endpoints (NVIDIA_API_KEY)
 *  - cloudflare: Workers AI REST (CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN)
 *                Free tier: ~10k neurons/day.
 *  - hf:         Hugging Face Inference Providers router (HF_TOKEN)
 *                Small free monthly credits, then pay-per-use.
 *
 * NVIDIA endpoints verified live July 2026. Cloudflare model ids are their
 * documented stable ids. HF ids route via router.huggingface.co.
 */

export type MediaKind = 'image' | 'video';
export type MediaProvider = 'nvidia' | 'cloudflare' | 'hf';

export interface MediaModel {
  id: string; // registry id used by the API
  label: string;
  kind: MediaKind;
  provider: MediaProvider;
  endpoint: string; // provider-specific model path/id
  maxPrompt: number; // provider-enforced prompt length limit
  note: string; // short descriptor shown in the UI
}

export const MEDIA_MODELS: MediaModel[] = [
  // ─── Images: NVIDIA ───────────────────────────────────────────
  // Klein is invoked via the raw NVCF pexec host — ai.api.nvidia.com answers
  // Vercel egress with empty-body errors while api.nvcf.nvidia.com behaves
  // (verified Sept 2026 by probing production directly).
  {
    id: 'nvidia-flux-klein',
    label: 'FLUX.2 Klein',
    kind: 'image',
    provider: 'nvidia',
    endpoint: 'nvcf:f67e96d8-1c4e-422e-a913-90f00e19aa9a',
    maxPrompt: 800,
    note: 'Fast · NVIDIA',
  },
  // flux.1-dev REMOVED Sept 9 2026 — NVIDIA's backend function now errors on
  // every call (nvcf-status: errored), same fate as flux.1-schnell in July.
  // Cosmos accepts ONLY {prompt} (width/height cause a 503) — the
  // '?prompt-only' marker tells runNvidia to strip the extras. Self-scoring
  // multi-pass model; renders take ~3-4 minutes via the async polling flow.
  {
    id: 'nvidia-cosmos3',
    label: 'Cosmos 3 Super',
    kind: 'image',
    provider: 'nvidia',
    endpoint: 'nvcf:f65a2585-3b67-46ce-a431-af764d93e954?prompt-only',
    maxPrompt: 1500,
    note: 'Newest NVIDIA · slow (~3-4 min)',
  },
  // ─── Images: Cloudflare Workers AI (free daily allocation) ────
  // flux-2-* endpoints require multipart/form-data input (verified Sept 2026);
  // runCloudflare switches encoding on the endpoint name. flux-2-dev exists
  // too but renders >120s — over the 60s function cap, so it's not listed.
  {
    id: 'cf-flux2-klein-4b',
    label: 'FLUX.2 Klein 4B (CF)',
    kind: 'image',
    provider: 'cloudflare',
    endpoint: '@cf/black-forest-labs/flux-2-klein-4b',
    maxPrompt: 2000,
    note: 'New FLUX.2 · Cloudflare',
  },
  {
    id: 'cf-flux2-klein-9b',
    label: 'FLUX.2 Klein 9B (CF)',
    kind: 'image',
    provider: 'cloudflare',
    endpoint: '@cf/black-forest-labs/flux-2-klein-9b',
    maxPrompt: 2000,
    note: 'New FLUX.2, higher quality · Cloudflare',
  },
  {
    id: 'cf-leonardo-phoenix',
    label: 'Leonardo Phoenix',
    kind: 'image',
    provider: 'cloudflare',
    endpoint: '@cf/leonardo/phoenix-1.0',
    maxPrompt: 2000,
    note: 'Vivid styles · Cloudflare',
  },
  {
    id: 'cf-lucid-origin',
    label: 'Leonardo Lucid Origin',
    kind: 'image',
    provider: 'cloudflare',
    endpoint: '@cf/leonardo/lucid-origin',
    maxPrompt: 2000,
    note: 'Sharp & versatile · Cloudflare',
  },
  {
    id: 'cf-flux-schnell',
    label: 'FLUX.1 Schnell',
    kind: 'image',
    provider: 'cloudflare',
    endpoint: '@cf/black-forest-labs/flux-1-schnell',
    maxPrompt: 2000,
    note: 'Fast · Cloudflare',
  },
  {
    id: 'cf-sdxl-lightning',
    label: 'SDXL Lightning',
    kind: 'image',
    provider: 'cloudflare',
    endpoint: '@cf/bytedance/stable-diffusion-xl-lightning',
    maxPrompt: 2000,
    note: 'Realistic · Cloudflare',
  },
  {
    id: 'cf-sdxl',
    label: 'SDXL Base',
    kind: 'image',
    provider: 'cloudflare',
    endpoint: '@cf/stabilityai/stable-diffusion-xl-base-1.0',
    maxPrompt: 2000,
    note: 'Classic SDXL · Cloudflare',
  },
  {
    id: 'cf-dreamshaper',
    label: 'DreamShaper 8',
    kind: 'image',
    provider: 'cloudflare',
    endpoint: '@cf/lykon/dreamshaper-8-lcm',
    maxPrompt: 2000,
    note: 'Artistic · Cloudflare',
  },
  // ─── Images: Hugging Face router → fal (verified Sept 2026) ──
  // Together's image routes died (models delisted / third-party data sharing
  // blocked); fal is the live provider for all three. Endpoints are fal ids,
  // called synchronously at /fal-ai/{id}.
  {
    id: 'hf-flux-schnell',
    label: 'FLUX.1 Schnell (HF)',
    kind: 'image',
    provider: 'hf',
    endpoint: 'fal-ai/flux/schnell',
    maxPrompt: 2000,
    note: 'Fast · Hugging Face',
  },
  {
    id: 'hf-sdxl',
    label: 'SDXL',
    kind: 'image',
    provider: 'hf',
    endpoint: 'fal-ai/fast-sdxl',
    maxPrompt: 2000,
    note: 'Classic SDXL · Hugging Face',
  },
  {
    id: 'hf-qwen-image',
    label: 'Qwen-Image',
    kind: 'image',
    provider: 'hf',
    endpoint: 'fal-ai/qwen-image',
    maxPrompt: 2000,
    note: 'Best text-in-image · Hugging Face',
  },
  // ─── Video: Hugging Face router → fal queue (verified Sept 2026) ─
  // Video endpoints are fal provider ids, called through HF's router at
  // /fal-ai/{id}?_subdomain=queue with async polling. Uses HF credits —
  // cheaper models first so free credits stretch further. NVIDIA and
  // Cloudflare host no text-to-video API (Cosmos is self-host-only NIM).
  {
    id: 'hf-ltx',
    label: 'LTX-Video',
    kind: 'video',
    provider: 'hf',
    endpoint: 'fal-ai/ltx-video-13b-distilled',
    maxPrompt: 1200,
    note: 'Fastest & cheapest video · Hugging Face',
  },
  {
    id: 'hf-wan-5b',
    label: 'Wan 2.2 (5B)',
    kind: 'video',
    provider: 'hf',
    endpoint: 'fal-ai/wan/v2.2-5b/text-to-video',
    maxPrompt: 1200,
    note: 'Fast video · Hugging Face',
  },
  {
    id: 'hf-wan',
    label: 'Wan 2.2 (14B)',
    kind: 'video',
    provider: 'hf',
    endpoint: 'fal-ai/wan/v2.2-a14b/text-to-video',
    maxPrompt: 1200,
    note: 'Cinematic video · Hugging Face',
  },
  {
    id: 'hf-hunyuan',
    label: 'HunyuanVideo',
    kind: 'video',
    provider: 'hf',
    endpoint: 'fal-ai/hunyuan-video',
    maxPrompt: 1200,
    note: '13B cinematic video · Hugging Face',
  },
];

export function providerConfigured(p: MediaProvider): boolean {
  switch (p) {
    case 'nvidia':
      return !!process.env.NVIDIA_API_KEY;
    case 'cloudflare':
      return !!process.env.CLOUDFLARE_ACCOUNT_ID && !!process.env.CLOUDFLARE_API_TOKEN;
    case 'hf':
      return !!process.env.HF_TOKEN;
  }
}

export function availableMediaModels(): MediaModel[] {
  return MEDIA_MODELS.filter((m) => providerConfigured(m.provider));
}

export function getMediaModel(id: string): MediaModel | undefined {
  return MEDIA_MODELS.find((m) => m.id === id);
}
