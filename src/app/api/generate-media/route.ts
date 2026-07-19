import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyToken } from '@/lib/auth';
import { getMediaModel, providerConfigured, type MediaModel } from '@/lib/media-models';
import { DAILY_CREDITS, CREDIT_COSTS, getCreditsUsedToday, chargeCredits, refundCredits } from '@/lib/credits';
import { getUserKey } from '@/lib/user-keys';

export const runtime = 'nodejs';
export const maxDuration = 60;

const schema = z.object({
  modelId: z.string().min(1),
  prompt: z.string().min(1).max(5000),
  aspectRatio: z.string().regex(/^\d+:\d+$/).default('16:9'),
  seed: z.number().int().optional(),
});

function clampPrompt(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  const cut = text.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > maxLen * 0.6 ? cut.slice(0, lastSpace) : cut).trim();
}

function dims(ar: string): { width: number; height: number } {
  const m = ar.match(/^(\d+):(\d+)$/);
  if (!m) return { width: 1024, height: 1024 };
  const r = parseInt(m[1], 10) / parseInt(m[2], 10);
  if (r > 1.25) return { width: 1344, height: 768 };
  if (r < 0.8) return { width: 768, height: 1344 };
  return { width: 1024, height: 1024 };
}

const okJson = (data: unknown) => NextResponse.json(data);
const errJson = (status: number, error: string, detail?: string, hint?: string) =>
  NextResponse.json({ error, detail, hint }, { status });

const HF_CREDITS_HINT =
  'The app\'s Hugging Face free credits are used up. Add your OWN Hugging Face token in Settings → API Keys to generate on your own quota (free tokens at huggingface.co/settings/tokens), or buy credits at huggingface.co/settings/billing.';

// ─── NVIDIA (NVCF async: 45s hold, then 202+reqId for client polling) ───────
async function runNvidia(model: MediaModel, prompt: string, ar: string, seed: number, deadline: number, apiKey: string) {
  const { width, height } = dims(ar);
  const isDistilled = /klein|schnell|turbo/i.test(model.endpoint);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(2_000, deadline - Date.now()));
  const res = await fetch(`https://ai.api.nvidia.com/v1/genai/${model.endpoint}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'NVCF-POLL-SECONDS': '45',
    },
    body: JSON.stringify({ prompt, width, height, steps: isDistilled ? 4 : 28, seed }),
    signal: controller.signal,
  }).finally(() => clearTimeout(timer));

  if (res.status === 202) {
    const reqId = res.headers.get('NVCF-REQID') || res.headers.get('nvcf-reqid');
    if (reqId) return okJson({ pending: true, reqId, modelId: model.id });
  }
  const text = await res.text();
  if (!res.ok) {
    return errJson(502, `${model.label} failed`, text.slice(0, 250));
  }
  let data: any;
  try { data = JSON.parse(text); } catch { return errJson(502, 'Invalid response from NVIDIA'); }
  let b64: string | null = data.artifacts?.[0]?.base64 ?? data.data?.[0]?.b64_json ?? null;
  if (!b64 && typeof data.image === 'string') b64 = data.image;
  if (!b64) return errJson(502, 'No image returned from model');
  if (!b64.startsWith('data:')) b64 = `data:image/jpeg;base64,${b64}`;
  return okJson({ modelId: model.id, kind: 'image', media: { base64: b64, url: null } });
}

// ─── Cloudflare Workers AI ──────────────────────────────────────────────────
async function runCloudflare(model: MediaModel, prompt: string, deadline: number) {
  const acct = process.env.CLOUDFLARE_ACCOUNT_ID;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(2_000, deadline - Date.now()));
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${acct}/ai/run/${model.endpoint}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt }),
      signal: controller.signal,
    }
  ).finally(() => clearTimeout(timer));

  const contentType = res.headers.get('content-type') || '';
  if (!res.ok) {
    const text = await res.text();
    return errJson(502, `${model.label} failed`, text.slice(0, 250),
      res.status === 401 || res.status === 403
        ? 'Check CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN (token needs the Workers AI permission).'
        : undefined);
  }
  if (contentType.includes('application/json')) {
    const data: any = await res.json();
    const b64 = data?.result?.image;
    if (!b64) return errJson(502, 'No image returned from model');
    return okJson({ modelId: model.id, kind: 'image', media: { base64: `data:image/jpeg;base64,${b64}`, url: null } });
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 1000) return errJson(502, 'Empty image from model');
  const mime = contentType.startsWith('image/') ? contentType : 'image/png';
  return okJson({ modelId: model.id, kind: 'image', media: { base64: `data:${mime};base64,${buf.toString('base64')}`, url: null } });
}

// ─── Hugging Face router ────────────────────────────────────────────────────
// Images: Together's OpenAI-compatible route (verified live July 2026).
// Video: fal's async queue — POST returns a request_id which the client polls
// via /api/generate-media/status (each poll is its own request, so long video
// renders aren't bound by the 60s function limit).
async function runHf(model: MediaModel, prompt: string, deadline: number, hfToken: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(2_000, deadline - Date.now()));
  const headers = {
    Authorization: `Bearer ${hfToken}`,
    'Content-Type': 'application/json',
  };
  try {
    if (model.kind === 'image') {
      const res = await fetch('https://router.huggingface.co/together/v1/images/generations', {
        method: 'POST',
        headers,
        body: JSON.stringify({ model: model.endpoint, prompt, response_format: 'b64_json' }),
        signal: controller.signal,
      });
      const text = await res.text();
      if (!res.ok) {
        return errJson(502, `${model.label} failed`, text.slice(0, 250),
          res.status === 402 ? HF_CREDITS_HINT : undefined);
      }
      const data: any = JSON.parse(text);
      const item = data?.data?.[0];
      const b64 = item?.b64_json ? `data:image/png;base64,${item.b64_json}` : null;
      const url = item?.url ?? null;
      if (!b64 && !url) return errJson(502, 'No image returned from model');
      return okJson({ modelId: model.id, kind: 'image', media: { base64: b64, url } });
    }

    // Video via fal queue
    const res = await fetch(
      `https://router.huggingface.co/fal-ai/${model.endpoint}?_subdomain=queue`,
      { method: 'POST', headers, body: JSON.stringify({ prompt }), signal: controller.signal }
    );
    const text = await res.text();
    if (!res.ok) {
      return errJson(502, `${model.label} failed`, text.slice(0, 250),
        res.status === 402 ? HF_CREDITS_HINT : undefined);
    }
    let data: any;
    try { data = JSON.parse(text); } catch { return errJson(502, 'Invalid response from video provider'); }
    const requestId = data?.request_id;
    if (!requestId) return errJson(502, `${model.label} did not return a job id`, text.slice(0, 200));
    return okJson({ pending: true, falRequestId: requestId, falEndpoint: model.endpoint, modelId: model.id, kind: 'video' });
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(req: NextRequest) {
  const deadline = Date.now() + 55_000;
  let ledgerId = 0;
  try {
    const token = req.cookies.get('auth-token')?.value;
    const auth = token ? await verifyToken(token) : null;
    if (!auth) {
      return errJson(401, 'Authentication required');
    }

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return errJson(400, 'Invalid request', parsed.error.issues.map((i) => i.message).join(', '));
    }
    const { modelId, aspectRatio } = parsed.data;
    const model = getMediaModel(modelId);
    if (!model) return errJson(400, `Unknown model: ${modelId}`);

    // BYOK: a user's own key unlocks the provider even without platform keys,
    // and takes precedence so generation runs on their own quota.
    const userHf = model.provider === 'hf' ? await getUserKey(auth.userId, 'huggingface') : null;
    const userNvidia = model.provider === 'nvidia' ? await getUserKey(auth.userId, 'nvidia') : null;
    const hfToken = userHf?.apiKey || process.env.HF_TOKEN || '';
    const nvidiaKey = userNvidia?.apiKey || process.env.NVIDIA_API_KEY || '';

    const usable =
      (model.provider === 'hf' && !!hfToken) ||
      (model.provider === 'nvidia' && !!nvidiaKey) ||
      (model.provider === 'cloudflare' && providerConfigured('cloudflare'));
    if (!usable) {
      return errJson(501, `${model.label} is not configured`, undefined,
        'Add the provider keys in Settings → API Keys (or in the server environment — see ENVIRONMENT.md).');
    }

    // ── Daily credits (admins are unlimited) ────────────────────────────────
    if (auth.role !== 'admin') {
      const cost = CREDIT_COSTS[model.kind];
      const used = await getCreditsUsedToday(auth.userId);
      const remaining = Math.max(0, DAILY_CREDITS - used);
      if (cost > remaining) {
        return errJson(
          429,
          'Daily credit limit reached',
          `You've used ${used}/${DAILY_CREDITS} free daily credits (images cost 1, videos cost 2)` +
            (remaining > 0 ? ` — this ${model.kind} needs ${cost} but only ${remaining} remain.` : '.'),
          'Your credits reset every day at midnight UTC. Come back tomorrow — or ask the admin for more.'
        );
      }
      ledgerId = await chargeCredits(auth.userId, model.id, model.kind);
    }

    const prompt = clampPrompt(parsed.data.prompt, model.maxPrompt);
    const seed = parsed.data.seed ?? Math.floor(Math.random() * 1_000_000);

    let res: NextResponse;
    switch (model.provider) {
      case 'nvidia':
        res = await runNvidia(model, prompt, aspectRatio, seed, deadline, nvidiaKey);
        break;
      case 'cloudflare':
        res = await runCloudflare(model, prompt, deadline);
        break;
      case 'hf':
        res = await runHf(model, prompt, deadline, hfToken);
        break;
    }
    // Provider failed — the user shouldn't lose a credit for it.
    if (res.status >= 400 && ledgerId) await refundCredits(ledgerId);
    return res;
  } catch (err: any) {
    if (ledgerId) await refundCredits(ledgerId);
    if (err?.name === 'AbortError') {
      return errJson(504, 'Generation timed out', 'The provider took too long to respond.');
    }
    console.error('generate-media error:', err);
    return errJson(500, 'An unexpected error occurred.');
  }
}
