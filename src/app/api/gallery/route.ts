import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { verifyToken } from '@/lib/auth';
import { queryRows, exec } from '@/lib/db';

export const runtime = 'nodejs';
export const maxDuration = 30;

const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

interface GalleryRow {
  id: number;
  url: string;
  prompt: string | null;
  platform: string | null;
  model: string | null;
  aspect_ratio: string | null;
  created_at: string;
}

async function getUserId(req: NextRequest): Promise<number | null> {
  const token = req.cookies.get('auth-token')?.value;
  if (!token) return null;
  const auth = await verifyToken(token);
  return auth?.userId ?? null;
}

// ─── GET: list the current user's saved images ──────────────────────────────
export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  try {
    const rows = await queryRows<GalleryRow>(
      `SELECT id, url, prompt, platform, model, aspect_ratio, created_at
       FROM gallery_images WHERE user_id = ? ORDER BY id DESC LIMIT 60`,
      userId
    );
    return NextResponse.json({ configured: !!BLOB_TOKEN, images: rows });
  } catch (e) {
    console.error('Gallery list error:', e);
    return NextResponse.json({ error: 'Failed to load gallery' }, { status: 500 });
  }
}

// ─── POST: upload a generated image to Blob and record it ───────────────────
export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  // No Blob store configured — tell the client to fall back to local storage.
  if (!BLOB_TOKEN) {
    return NextResponse.json({ error: 'not_configured' }, { status: 501 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { dataUri, prompt, platform, model, aspectRatio } = body ?? {};
  if (!dataUri || typeof dataUri !== 'string') {
    return NextResponse.json({ error: 'dataUri is required' }, { status: 400 });
  }

  try {
    let url: string;

    if (dataUri.startsWith('http')) {
      // Already a hosted URL — store the reference as-is.
      url = dataUri;
    } else {
      const match = /^data:([^;]+);base64,([\s\S]+)$/.exec(dataUri);
      if (!match) {
        return NextResponse.json({ error: 'Unsupported image format' }, { status: 400 });
      }
      const contentType = match[1];
      const buffer = Buffer.from(match[2], 'base64');
      const ext = contentType.includes('png') ? 'png' : 'jpg';
      const blob = await put(`gallery/${userId}/${crypto.randomUUID()}.${ext}`, buffer, {
        access: 'public',
        contentType,
        token: BLOB_TOKEN,
      });
      url = blob.url;
    }

    const result = await exec(
      `INSERT INTO gallery_images (user_id, url, prompt, platform, model, aspect_ratio)
       VALUES (?, ?, ?, ?, ?, ?)`,
      userId,
      url,
      prompt ?? null,
      platform ?? null,
      model ?? null,
      aspectRatio ?? null
    );

    return NextResponse.json({
      image: {
        id: Number(result.lastInsertRowid ?? 0),
        url,
        prompt: prompt ?? null,
        platform: platform ?? null,
        model: model ?? null,
        aspect_ratio: aspectRatio ?? null,
      },
    });
  } catch (e) {
    console.error('Gallery save error:', e);
    return NextResponse.json({ error: 'Failed to save image' }, { status: 500 });
  }
}
