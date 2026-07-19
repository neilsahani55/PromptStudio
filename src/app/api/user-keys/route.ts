import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyToken } from '@/lib/auth';
import {
  KEY_PROVIDERS,
  listUserKeys,
  saveUserKey,
  deleteUserKey,
  validateProviderKey,
  type KeyProvider,
} from '@/lib/user-keys';

export const runtime = 'nodejs';

async function getAuth(req: NextRequest) {
  const token = req.cookies.get('auth-token')?.value;
  return token ? verifyToken(token) : null;
}

// GET → the caller's saved keys (masked — full keys are never returned)
export async function GET(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  const keys = await listUserKeys(auth.userId);
  return NextResponse.json({ keys, providers: KEY_PROVIDERS });
}

const saveSchema = z.object({
  provider: z.enum(KEY_PROVIDERS),
  apiKey: z.string().min(1).max(500),
  baseUrl: z.string().url().max(300).optional().or(z.literal('')),
  model: z.string().max(100).optional().or(z.literal('')),
});

// POST → validate against the live provider, then save encrypted
export async function POST(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const parsed = saveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', detail: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ') },
      { status: 400 }
    );
  }
  const { provider, apiKey } = parsed.data;
  const baseUrl = parsed.data.baseUrl || null;
  const model = parsed.data.model || null;

  const check = await validateProviderKey(provider as KeyProvider, apiKey, baseUrl);
  if (!check.ok) {
    return NextResponse.json({ error: 'Key validation failed', detail: check.detail }, { status: 422 });
  }

  await saveUserKey(auth.userId, provider as KeyProvider, apiKey, baseUrl, model);
  return NextResponse.json({ ok: true, detail: check.detail });
}

// DELETE ?provider=x → remove a saved key
export async function DELETE(req: NextRequest) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  const provider = req.nextUrl.searchParams.get('provider') as KeyProvider | null;
  if (!provider || !KEY_PROVIDERS.includes(provider)) {
    return NextResponse.json({ error: 'Unknown provider' }, { status: 400 });
  }
  await deleteUserKey(auth.userId, provider);
  return NextResponse.json({ ok: true });
}
