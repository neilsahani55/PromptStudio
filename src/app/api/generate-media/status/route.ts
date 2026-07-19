import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getUserKey } from '@/lib/user-keys';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Only fal endpoints from our registry may be polled (prevents SSRF via the
// endpoint param).
const ALLOWED_ENDPOINTS = new Set(['fal-ai/wan/v2.2-a14b/text-to-video', 'fal-ai/hunyuan-video']);

// Polls a fal queue job through the HF router. The client calls this every
// few seconds — each poll is its own short request, so multi-minute video
// renders are not bound by any single function's 60s limit.
export async function GET(req: NextRequest) {
  const token = req.cookies.get('auth-token')?.value;
  const auth = token ? await verifyToken(token) : null;
  if (!auth) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const endpoint = req.nextUrl.searchParams.get('endpoint') || '';
  const requestId = req.nextUrl.searchParams.get('id') || '';
  if (!ALLOWED_ENDPOINTS.has(endpoint) || !/^[\w-]+$/.test(requestId)) {
    return NextResponse.json({ error: 'Invalid poll parameters' }, { status: 400 });
  }

  const userHf = await getUserKey(auth.userId, 'huggingface');
  const hfToken = userHf?.apiKey || process.env.HF_TOKEN;
  if (!hfToken) return NextResponse.json({ error: 'Hugging Face is not configured' }, { status: 501 });
  const headers = { Authorization: `Bearer ${hfToken}` };

  // fal queue URLs are rooted at the endpoint's first two path segments
  // (e.g. fal-ai/wan for fal-ai/wan/v2.2-a14b/text-to-video).
  const root = endpoint.split('/').slice(0, 2).join('/');
  const base = `https://router.huggingface.co/fal-ai/${root}/requests/${requestId}`;

  try {
    const statusRes = await fetch(`${base}/status?_subdomain=queue`, { headers });
    if (!statusRes.ok) {
      const text = await statusRes.text();
      return NextResponse.json(
        { error: 'Video job failed', detail: text.slice(0, 250) },
        { status: 502 }
      );
    }
    const status: any = await statusRes.json();
    if (status?.status !== 'COMPLETED') {
      return NextResponse.json({ pending: true, queue: status?.status || 'IN_PROGRESS' });
    }

    const resultRes = await fetch(`${base}?_subdomain=queue`, { headers });
    const text = await resultRes.text();
    if (!resultRes.ok) {
      return NextResponse.json({ error: 'Could not fetch the finished video', detail: text.slice(0, 250) }, { status: 502 });
    }
    let data: any;
    try { data = JSON.parse(text); } catch { return NextResponse.json({ error: 'Invalid video result' }, { status: 502 }); }
    const url: string | null = data?.video?.url ?? data?.url ?? data?.output?.url ?? null;
    if (!url) return NextResponse.json({ error: 'No video in result', detail: text.slice(0, 200) }, { status: 502 });
    return NextResponse.json({ done: true, media: { url, base64: null }, kind: 'video' });
  } catch (e) {
    console.error('Video status poll error:', e);
    return NextResponse.json({ error: 'Failed to check video status' }, { status: 500 });
  }
}
