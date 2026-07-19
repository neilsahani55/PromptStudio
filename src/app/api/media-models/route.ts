import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { MEDIA_MODELS, providerConfigured } from '@/lib/media-models';
import { DAILY_CREDITS, CREDIT_COSTS, getCreditsUsedToday } from '@/lib/credits';
import { listUserKeys } from '@/lib/user-keys';

export const runtime = 'nodejs';

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

  const available = MEDIA_MODELS
    .filter((m) => providerConfigured(m.provider) || userProviders.has(m.provider))
    .map(({ id, label, kind, note, provider }) => ({ id, label, kind, note, provider }));
  const configuredProviders = new Set(available.map((m) => m.provider));
  const missingProviders = Array.from(
    new Set(MEDIA_MODELS.map((m) => m.provider).filter((p) => !configuredProviders.has(p)))
  );

  const unlimited = auth.role === 'admin';
  const used = unlimited ? 0 : await getCreditsUsedToday(auth.userId);

  return NextResponse.json({
    image: available.filter((m) => m.kind === 'image'),
    video: available.filter((m) => m.kind === 'video'),
    missingProviders,
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
