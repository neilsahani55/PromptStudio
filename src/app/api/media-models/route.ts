import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { MEDIA_MODELS, providerConfigured } from '@/lib/media-models';
import { DAILY_CREDITS, CREDIT_COSTS, getCreditsUsedToday } from '@/lib/credits';
import { listUserKeys } from '@/lib/user-keys';

export const runtime = 'nodejs';

// The platform HF token runs on tiny free monthly credits that regularly run
// dry — dead model buttons for weeks are worse than absent ones, so probe the
// router's billing gate and hide platform-HF models while depleted (users
// with their own HF key still see them). The empty-body probe costs nothing:
// a 402 fires before request validation; with credits it's a validation error.
let hfProbe: { depleted: boolean; at: number } | null = null;
async function platformHfDepleted(): Promise<boolean> {
  if (!process.env.HF_TOKEN) return false;
  if (hfProbe && Date.now() - hfProbe.at < 10 * 60_000) return hfProbe.depleted;
  try {
    const res = await fetch('https://router.huggingface.co/fal-ai/fal-ai/flux/schnell', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.HF_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
      signal: AbortSignal.timeout(5_000),
    });
    hfProbe = { depleted: res.status === 402, at: Date.now() };
  } catch {
    // Network hiccup — fail open (show the models) and retry next window.
    hfProbe = { depleted: false, at: Date.now() };
  }
  return hfProbe.depleted;
}

// Lists generation models available with the currently configured provider
// keys, the user's remaining daily credits, and which providers are
// unconfigured (so the UI can hint setup).
export async function GET(req: NextRequest) {
  const token = req.cookies.get('auth-token')?.value;
  const auth = token ? await verifyToken(token) : null;
  if (!auth) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  // A provider is usable when the platform has keys OR the user brought their
  // own (BYOK): huggingface key → hf models, nvidia key → nvidia models.
  const userKeys = await listUserKeys(auth.userId);
  const userProviders = new Set(
    userKeys
      .map((k) => (k.provider === 'huggingface' ? 'hf' : k.provider === 'nvidia' ? 'nvidia' : null))
      .filter(Boolean) as string[]
  );

  const hfDepleted = await platformHfDepleted();
  const available = MEDIA_MODELS
    .filter((m) => {
      if (userProviders.has(m.provider)) return true;
      if (m.provider === 'hf' && hfDepleted) return false;
      return providerConfigured(m.provider);
    })
    .map(({ id, label, kind, note, provider }) => ({ id, label, kind, note, provider }));
  const configuredProviders = new Set(available.map((m) => m.provider));
  const missingProviders = Array.from(
    new Set(MEDIA_MODELS.map((m) => m.provider).filter((p) => !configuredProviders.has(p)))
    // Depleted-HF gets its own dedicated notice — not the "add keys" hint.
  ).filter((p) => !(p === 'hf' && hfDepleted));

  const unlimited = auth.role === 'admin';
  const used = unlimited ? 0 : await getCreditsUsedToday(auth.userId);

  return NextResponse.json({
    image: available.filter((m) => m.kind === 'image'),
    video: available.filter((m) => m.kind === 'video'),
    missingProviders,
    hfDepleted,
    credits: {
      total: DAILY_CREDITS,
      used,
      remaining: unlimited ? DAILY_CREDITS : Math.max(0, DAILY_CREDITS - used),
      unlimited,
      imageCost: CREDIT_COSTS.image,
      videoCost: CREDIT_COSTS.video,
    },
  });
}
