import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { availableMediaModels, MEDIA_MODELS } from '@/lib/media-models';
import { DAILY_CREDITS, CREDIT_COSTS, getCreditsUsedToday } from '@/lib/credits';

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

  const available = availableMediaModels().map(({ id, label, kind, note, provider }) => ({
    id, label, kind, note, provider,
  }));
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
