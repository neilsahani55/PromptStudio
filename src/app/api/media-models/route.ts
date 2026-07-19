import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { availableMediaModels, MEDIA_MODELS } from '@/lib/media-models';

export const runtime = 'nodejs';

// Lists generation models available with the currently configured provider
// keys, plus which providers are unconfigured (so the UI can hint setup).
export async function GET(req: NextRequest) {
  const token = req.cookies.get('auth-token')?.value;
  if (!token || !(await verifyToken(token))) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const available = availableMediaModels().map(({ id, label, kind, note, provider }) => ({
    id, label, kind, note, provider,
  }));
  const configuredProviders = new Set(available.map((m) => m.provider));
  const missingProviders = Array.from(
    new Set(MEDIA_MODELS.map((m) => m.provider).filter((p) => !configuredProviders.has(p)))
  );

  return NextResponse.json({
    image: available.filter((m) => m.kind === 'image'),
    video: available.filter((m) => m.kind === 'video'),
    missingProviders,
  });
}
