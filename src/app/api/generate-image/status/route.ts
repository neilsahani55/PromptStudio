import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

export const runtime = 'nodejs';
export const maxDuration = 60;

const NVIDIA_KEY = process.env.NVIDIA_API_KEY;

// Polls NVIDIA's NVCF status endpoint for an in-progress image job. The client
// calls this repeatedly (every few seconds) so total generation time is not
// bound by any single request's 60s limit.
export async function GET(req: NextRequest) {
  const token = req.cookies.get('auth-token')?.value;
  if (!token || !(await verifyToken(token))) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const reqId = req.nextUrl.searchParams.get('reqId');
  if (!reqId) return NextResponse.json({ error: 'reqId required' }, { status: 400 });
  if (!NVIDIA_KEY) return NextResponse.json({ error: 'NVIDIA key not configured' }, { status: 500 });

  const statusUrl = `https://api.nvcf.nvidia.com/v2/nvcf/pexec/status/${reqId}`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 50_000);
    const res = await fetch(statusUrl, {
      method: 'GET',
      headers: { Authorization: `Bearer ${NVIDIA_KEY}`, Accept: 'application/json' },
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));

    if (res.status === 202) {
      return NextResponse.json({ pending: true });
    }

    const text = await res.text();
    if (!res.ok) {
      return NextResponse.json(
        { error: 'Image job failed', detail: text.slice(0, 300), upstreamStatus: res.status },
        { status: 502 }
      );
    }

    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: 'Invalid response from image service.' }, { status: 502 });
    }

    let base64: string | null = null;
    let imageUrl: string | null = null;
    if (data.artifacts?.length > 0) base64 = data.artifacts[0].base64;
    else if (data.data?.length > 0) { imageUrl = data.data[0].url; base64 = data.data[0].b64_json; }
    else if (typeof data.image === 'string') base64 = data.image;
    else if (data.image?.base64) base64 = data.image.base64;

    if (!base64 && !imageUrl) {
      return NextResponse.json({ error: 'No image returned from model' }, { status: 502 });
    }

    // Content-filter detection: NVIDIA returns a tiny black image when blocked.
    if (base64) {
      const raw = base64.replace(/^data:[^,]+,/, '');
      if (Math.floor((raw.length * 3) / 4) < 15_000) {
        return NextResponse.json(
          {
            error: 'Image generation blocked by content filter.',
            detail: 'The model returned an empty/black image (safety filter).',
            hint: 'Try rephrasing: avoid "photorealistic", brand names, or named people.',
          },
          { status: 502 }
        );
      }
      if (!base64.startsWith('data:image/')) {
        const isPng = base64.startsWith('iVBORw0KGgo');
        base64 = `data:${isPng ? 'image/png' : 'image/jpeg'};base64,${base64}`;
      }
    }

    return NextResponse.json({ done: true, image: { url: imageUrl, base64 } });
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      return NextResponse.json({ pending: true });
    }
    console.error('Status poll error:', e);
    return NextResponse.json({ error: 'Failed to check image status' }, { status: 500 });
  }
}
