import { NextRequest, NextResponse } from 'next/server';
import { queryRow } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

async function requireAdmin(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) return null;
  const auth = await verifyToken(token);
  if (!auth || auth.role !== 'admin') return null;
  return auth;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (!auth) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const row = await queryRow<{ count: number | bigint }>(
      `SELECT COUNT(*) AS count FROM feedback WHERE status = 'new'`
    );

    return NextResponse.json({ count: Number(row?.count ?? 0) });
  } catch (error) {
    console.error('Admin feedback notifications GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
