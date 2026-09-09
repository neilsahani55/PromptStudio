import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyToken } from '@/lib/auth';
import { KEY_PROVIDERS, getUserKey, listProviderModels, type KeyProvider } from '@/lib/user-keys';

export const runtime = 'nodejs';

const schema = z.object({
  provider: z.enum(KEY_PROVIDERS),
  // Optional: when omitted the user's saved key for the provider is used, so
  // the list also works from the Edit flow without re-typing the key.
  apiKey: z.string().min(1).max(500).optional(),
  baseUrl: z.string().url().max(300).optional().or(z.literal('')),
});

// POST → list the models the given (or saved) key can access at its provider.
// The key is only relayed to the provider's own models endpoint, never stored.
export async function POST(req: NextRequest) {
  const token = req.cookies.get('auth-token')?.value;
  const auth = token ? await verifyToken(token) : null;
  if (!auth) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const { provider } = parsed.data;

  let apiKey = parsed.data.apiKey || '';
  let baseUrl = parsed.data.baseUrl || '';
  if (!apiKey) {
    const saved = await getUserKey(auth.userId, provider as KeyProvider);
    if (!saved) {
      return NextResponse.json(
        { error: 'Enter the API key first (or save one for this provider).' },
        { status: 404 }
      );
    }
    apiKey = saved.apiKey;
    baseUrl = baseUrl || saved.baseUrl || '';
  }

  const result = await listProviderModels(provider as KeyProvider, apiKey, baseUrl || null);
  if (!result.ok) {
    return NextResponse.json({ error: 'Could not list models', detail: result.detail }, { status: 422 });
  }
  return NextResponse.json({ models: result.models });
}
