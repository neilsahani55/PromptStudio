import { NextRequest, NextResponse } from 'next/server';
import { del } from '@vercel/blob';
import { verifyToken } from '@/lib/auth';
import { queryRow, exec } from '@/lib/db';

export const runtime = 'nodejs';

const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

async function getUserId(req: NextRequest): Promise<number | null> {
  const token = req.cookies.get('auth-token')?.value;
  if (!token) return null;
  const auth = await verifyToken(token);
  return auth?.userId ?? null;
}

// ─── DELETE: remove one of the current user's saved images ──────────────────
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const { id } = await params;
  const numId = Number(id);
  if (!Number.isFinite(numId)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  try {
    // Look up the row (scoped to this user) so we can also delete the blob.
    const row = await queryRow<{ url: string }>(
      `SELECT url FROM gallery_images WHERE id = ? AND user_id = ?`,
      numId,
      userId
    );
    if (!row) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await exec(`DELETE FROM gallery_images WHERE id = ? AND user_id = ?`, numId, userId);

    // Best-effort blob cleanup — never fail the request if this errors.
    if (BLOB_TOKEN && row.url.includes('blob.vercel-storage.com')) {
      try {
        await del(row.url, { token: BLOB_TOKEN });
      } catch (e) {
        console.warn('Blob delete failed (row already removed):', e);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Gallery delete error:', e);
    return NextResponse.json({ error: 'Failed to delete image' }, { status: 500 });
  }
}
