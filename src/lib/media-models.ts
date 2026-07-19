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
  {
    id: 'nvidia-flux-klein',
    label: 'FLUX.2 Klein',
    kind: 'image',
    provider: 'nvidia',
    endpoint: 'black-forest-labs/flux.2-klein-4b',
    maxPrompt: 800,
    note: 'Fast · NVIDIA',
  },
  {
    id: 'nvidia-flux-dev',
    label: 'FLUX.1 Dev',
    kind: 'image',
    provider: 'nvidia',
    endpoint: 'black-forest-labs/flux.1-dev',
    maxPrompt: 1500,
    note: 'High quality · NVIDIA',
  },
  // ─── Images: Cloudflare Workers AI (free daily allocation) ────
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
  // ─── Images: Hugging Face router ──────────────────────────────
  {
    id: 'hf-flux-schnell',
    label: 'FLUX.1 Schnell (HF)',
    kind: 'image',
    provider: 'hf',
    endpoint: 'black-forest-labs/FLUX.1-schnell',
    maxPrompt: 2000,
    note: 'Fast · Hugging Face',
  },
  {
    id: 'hf-flux-dev',
    label: 'FLUX.1 Dev (HF)',
    kind: 'image',
    provider: 'hf',
    endpoint: 'black-forest-labs/FLUX.1-dev',
    maxPrompt: 2000,
    note: 'High quality · Hugging Face',
  },
  {
    id: 'hf-sd35',
    label: 'SD 3.5 Large',
    kind: 'image',
    provider: 'hf',
    endpoint: 'stabilityai/stable-diffusion-3.5-large',
    maxPrompt: 2000,
    note: 'Stable Diffusion flagship · Hugging Face',
  },
  {
    id: 'hf-sdxl',
    label: 'SDXL',
    kind: 'image',
    provider: 'hf',
    endpoint: 'stabilityai/stable-diffusion-xl-base-1.0',
    maxPrompt: 2000,
    note: 'Classic SDXL · Hugging Face',
  },
  {
    id: 'hf-qwen-image',
    label: 'Qwen-Image',
    kind: 'image',
    provider: 'hf',
    endpoint: 'Qwen/Qwen-Image',
    maxPrompt: 2000,
    note: 'Best text-in-image · Hugging Face',
  },
  // ─── Video: Hugging Face router (beta — uses HF credits) ─────
  {
    id: 'hf-ltx-video',
    label: 'LTX-Video',
    kind: 'video',
    provider: 'hf',
    endpoint: 'Lightricks/LTX-Video',
    maxPrompt: 1200,
    note: 'Fast video · Hugging Face',
  },
  {
    id: 'hf-wan',
    label: 'Wan 2.2',
    kind: 'video',
    provider: 'hf',
    endpoint: 'Wan-AI/Wan2.2-T2V-A14B',
    maxPrompt: 1200,
    note: 'Cinematic video · Hugging Face',
  },
  {
    id: 'hf-hunyuan',
    label: 'HunyuanVideo',
    kind: 'video',
    provider: 'hf',
    endpoint: 'tencent/HunyuanVideo',
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
