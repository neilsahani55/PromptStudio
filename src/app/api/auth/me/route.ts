import { NextRequest, NextResponse } from 'next/server';
import { queryRow } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const user = await queryRow<any>(
      'SELECT id, name, email, role, status, avatar_url, created_at FROM users WHERE id = ?',
      payload.userId
    );

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.status === 'blocked') {
      const response = NextResponse.json(
        { error: 'Your account has been blocked' },
        { status: 403 }
      );
      response.cookies.set('auth-token', '', {
        httpOnly: true,
        path: '/',
        maxAge: 0,
      });
      return response;
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Me error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
