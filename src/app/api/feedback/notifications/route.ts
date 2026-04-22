import { NextRequest, NextResponse } from 'next/server';
import { queryRow } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

async function getAuthUser(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const row = await queryRow<{ count: number | bigint }>(
      `SELECT COUNT(*) AS count
       FROM feedback
       WHERE user_id = ?
         AND admin_responded_at IS NOT NULL
         AND (user_viewed_at IS NULL OR admin_responded_at > user_viewed_at)`,
      auth.userId
    );

    return NextResponse.json({ count: Number(row?.count ?? 0) });
  } catch (error) {
    console.error('User feedback notifications GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
