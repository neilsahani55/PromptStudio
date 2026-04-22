import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { styleProfiles, BrandStyle } from '@/ai/utils/style-profiles';
import { verifyToken } from '@/lib/auth';

const FLUX_KEY = process.env.NVIDIA_API_KEY_FLUX;
const SD35_KEY = process.env.NVIDIA_API_KEY_SD35;

// Direct endpoints for NVIDIA-hosted models.
// Defaults target models typically available on NVIDIA NIM free tier:
//   - Flux Schnell (4-step distilled, free-tier friendly)
//   - Stable Diffusion 3.5 Large (current SD flagship)
// Override with env vars if your NVIDIA account has access to a different endpoint:
//   NVIDIA_FLUX_URL=https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-dev
//   NVIDIA_SD_URL=https://ai.api.nvidia.com/v1/genai/stabilityai/stable-diffusion-3-medium
const FLUX_URL =
  process.env.NVIDIA_FLUX_URL ||
  'https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-schnell';
const SD_URL =
  process.env.NVIDIA_SD_URL ||
  'https://ai.api.nvidia.com/v1/genai/stabilityai/stable-diffusion-3-5-large';

// Base negative prompt for SD3 to prevent generic stock look
const SD_BASE_NEGATIVE = "stock photo, watermark, amateur, blurry, distorted, low quality, grainy, text, signature, frame, border, disembodied hands, messy background";

// Accept any W:H pattern; unsupported ratios are normalised downstream.
const ASPECT_RATIO_PATTERN = /^\d+:\d+$/;

const generateImageSchema = z.object({
  model: z.enum(['flux', 'sd35']),
  prompt: z.string().min(1).max(5000),
  negativePrompt: z.string().max(2000).optional(),
  aspectRatio: z
    .string()
    .regex(ASPECT_RATIO_PATTERN, 'aspectRatio must be in W:H format')
    .default('16:9'),
  seed: z.number().int().optional(),
  stylePreset: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();

    // Authentication check
    const token = req.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const auth = await verifyToken(token);
    if (!auth) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const parsed = generateImageSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          detail: parsed.error.issues
            .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
            .join(', '),
        },
        { status: 400 }
      );
    }

    const { model: requestedModel, prompt, negativePrompt, aspectRatio, seed, stylePreset } = parsed.data;

    // Try the requested model; if it's SD and returns 404 (endpoint not in
    // user's NVIDIA function catalog), transparently fall back to Flux so the
    // button still produces an image.
    let model: 'flux' | 'sd35' = requestedModel;
    let fallbackUsed = false;
    let nim = buildNimRequest(model, { prompt, negativePrompt, aspectRatio, seed, stylePreset });

    if (!nim.key) {
      return NextResponse.json(
        { error: `API key for model ${model} is not configured` },
        { status: 500 }
      );
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`Sending request to ${nim.url} for model ${model}`);
    }

    const callNim = (n: typeof nim) =>
      fetch(n.url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${n.key}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(n.payload),
      });

    let res = await callNim(nim);

    // SD → Flux fallback: only triggers on 404 (endpoint not in catalog),
    // never on 400/422 (bad payload), 401/403 (auth), or 429 (rate limit).
    if (!res.ok && res.status === 404 && requestedModel === 'sd35') {
      const fluxReq = buildNimRequest('flux', { prompt, negativePrompt, aspectRatio, seed, stylePreset });
      if (fluxReq.key) {
        console.warn("SD endpoint returned 404 — falling back to Flux.");
        fallbackUsed = true;
        model = 'flux';
        nim = fluxReq;
        res = await callNim(fluxReq);
      }
    }

    if (!res.ok) {
      const errText = await res.text();
      console.error("NVIDIA NIM Error:", res.status, errText);

      // Try to extract a human-readable reason from NVIDIA's JSON error body
      // so the user sees the real cause instead of a generic "failed".
      let detail: string | undefined;
      try {
        const parsed = JSON.parse(errText);
        const raw = parsed?.detail ?? parsed?.title ?? parsed?.message ?? parsed?.error;
        // NVIDIA sometimes returns nested objects for `detail`; coerce defensively
        // so the client never sees "[object Object]".
        if (typeof raw === 'string') {
          detail = raw;
        } else if (raw != null) {
          detail = JSON.stringify(raw);
        } else {
          detail = errText.slice(0, 300);
        }
      } catch {
        detail = errText.slice(0, 300);
      }

      // Translate common NVIDIA errors into actionable advice.
      let hint: string | undefined;
      if (res.status === 404) {
        hint =
          `The '${model}' model endpoint is not available with your NVIDIA_API_KEY_${
            model === 'flux' ? 'FLUX' : 'SD35'
          }. ` +
          `This typically means your account's free tier doesn't include this specific model. ` +
          `Try setting NVIDIA_${model === 'flux' ? 'FLUX' : 'SD'}_URL to an endpoint you have access to, ` +
          `or check https://build.nvidia.com/ to see which image models your key can call.`;
      } else if (res.status === 401 || res.status === 403) {
        hint = `Your NVIDIA_API_KEY_${
          model === 'flux' ? 'FLUX' : 'SD35'
        } was rejected. Check the key is correct and not expired at https://build.nvidia.com/.`;
      } else if (res.status === 429) {
        hint = `NVIDIA rate limit exceeded for model '${model}'. Wait a minute and try again.`;
      }

      return NextResponse.json(
        {
          error: 'Image generation failed.',
          detail,
          hint,
          upstreamStatus: res.status,
        },
        { status: 502 }
      );
    }

    const responseText = await res.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error("Failed to parse JSON response:", responseText.slice(0, 200));
      return NextResponse.json(
        { error: 'Invalid response from image generation service.' },
        { status: 502 }
      );
    }
    
    // Handle different response formats
    // Flux/SD3.5 on ai.api.nvidia.com often return { artifacts: [{ base64: "..." }] }
    // or { data: [{ url: "..." }] } depending on the exact backend.
    
    let imageUrl = null;
    let base64 = null;

    if (data.artifacts && data.artifacts.length > 0) {
      base64 = data.artifacts[0].base64;
    } else if (data.data && data.data.length > 0) {
      imageUrl = data.data[0].url;
      base64 = data.data[0].b64_json;
    } else if (data.image) {
      // Direct base64 image response (seen with SD3 Medium)
      base64 = data.image;
    }

    // Sometimes data.image is an object with base64/url inside
    if (data.image && typeof data.image === 'object') {
        if (data.image.base64) base64 = data.image.base64;
        if (data.image.url) imageUrl = data.image.url;
    }

    if (!imageUrl && !base64) {
      console.error("Unexpected response structure:", JSON.stringify(data).slice(0, 200));
      return NextResponse.json(
        { error: 'No image returned from model' },
        { status: 500 }
      );
    }

    // Ensure base64 has the correct data URI prefix
    if (base64 && !base64.startsWith('data:image/')) {
      // Detect simple magic numbers for JPEG vs PNG
      const isPng = base64.startsWith('iVBORw0KGgo');
      const mimeType = isPng ? 'image/png' : 'image/jpeg'; // Default to jpeg for Flux/SD3
      base64 = `data:${mimeType};base64,${base64}`;
    }

    return NextResponse.json(
      {
        model,
        requestedModel,
        fallbackUsed,
        prompt,
        params: { aspectRatio, seed },
        image: { url: imageUrl, base64 },
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("API Route Error:", err);
    return NextResponse.json(
      { error: 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}

function buildNimRequest(
  model: 'flux' | 'sd35',
  opts: { prompt: string; negativePrompt?: string; aspectRatio: string; seed?: number; stylePreset?: string }
) {
  // Get style-specific negative prompts
  let styleNegatives = "";
  if (opts.stylePreset && styleProfiles[opts.stylePreset as BrandStyle]) {
    styleNegatives = styleProfiles[opts.stylePreset as BrandStyle].negativePrompts.join(", ");
  }

  // Calculate dimensions based on aspect ratio
  // Flux Dev on NIM has strict resolution support. 
  // Verified working: 1024x1024, 1344x768, 768x1344
  const { width, height } = aspectRatioToDims(opts.aspectRatio);

  if (model === 'flux') {
    // Flux Schnell is a 4-step distilled model — max 4 steps accepted by NIM.
    // Flux Dev / Pro support 20-50 steps; 30 is a good default for quality.
    const isSchnell = FLUX_URL.toLowerCase().includes('schnell');
    return {
      url: FLUX_URL,
      key: FLUX_KEY,
      payload: {
        prompt: opts.prompt,
        width,
        height,
        steps: isSchnell ? 4 : 30,
        seed: opts.seed,
      },
    };
  }

  // Stable Diffusion 3 Medium (fallback for 3.5)
  // Combine user negative prompt, style negatives, and base negatives
  const combinedNegative = [
    opts.negativePrompt,
    styleNegatives,
    SD_BASE_NEGATIVE
  ].filter(Boolean).join(", ");

  return {
    url: SD_URL,
    key: SD35_KEY,
    payload: {
      prompt: opts.prompt,
      aspect_ratio: normalizeSdAspectRatio(opts.aspectRatio),
      seed: opts.seed ?? 0,
      negative_prompt: combinedNegative,
      cfg_scale: 8.0, // Increased guidance for better adherence
      steps: 40     // Higher steps for better quality
    },
  };
}

// NVIDIA SD3 only accepts a fixed set of aspect ratios. Map anything else
// to the closest supported value.
const SD_SUPPORTED_RATIOS = [
  '21:9', '16:9', '3:2', '5:4', '1:1', '4:5', '2:3', '9:16', '9:21',
] as const;

function normalizeSdAspectRatio(ar: string): string {
  if ((SD_SUPPORTED_RATIOS as readonly string[]).includes(ar)) return ar;
  const m = ar.match(/^(\d+):(\d+)$/);
  if (!m) return '16:9';
  const r = parseInt(m[1], 10) / parseInt(m[2], 10);
  let best = '1:1';
  let bestDiff = Infinity;
  for (const candidate of SD_SUPPORTED_RATIOS) {
    const [cw, ch] = candidate.split(':').map(Number);
    const diff = Math.abs(cw / ch - r);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = candidate;
    }
  }
  return best;
}

// Flux NIM supports specific resolutions only. Pick the closest of the three
// verified combos: 1344x768 (wide), 1024x1024 (square), 768x1344 (tall).
function aspectRatioToDims(ar: string): { width: number; height: number } {
  const m = ar.match(/^(\d+):(\d+)$/);
  if (!m) return { width: 1344, height: 768 };
  const ratio = parseInt(m[1], 10) / parseInt(m[2], 10);
  if (ratio > 1.25) return { width: 1344, height: 768 };   // wide (incl. 4:3 -> wide)
  if (ratio < 0.8) return { width: 768, height: 1344 };    // tall
  return { width: 1024, height: 1024 };                     // square / near-square
}
