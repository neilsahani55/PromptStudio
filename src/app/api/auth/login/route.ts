import { NextRequest, NextResponse } from 'next/server';
import { exec, queryRow } from '@/lib/db';
import { verifyPassword, createToken, logActivity } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const user = await queryRow<any>(
      'SELECT * FROM users WHERE email = ?',
      email.toLowerCase().trim()
    );

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    if (user.status === 'blocked') {
      return NextResponse.json(
        { error: 'Your account has been blocked. Please contact an administrator.' },
        { status: 403 }
      );
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    await exec(
      "UPDATE users SET last_login = datetime('now') WHERE id = ?",
      user.id
    );

    const ip =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown';
    await logActivity(user.id, 'login', 'User logged in', ip);

    const token = await createToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      status: user.status || 'active',
    });

    const isProduction = process.env.NODE_ENV === 'production';

    const response = NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar_url: user.avatar_url,
        created_at: user.created_at,
      },
    });

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
