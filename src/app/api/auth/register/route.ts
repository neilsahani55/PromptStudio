import { NextRequest, NextResponse } from 'next/server';
import { exec, queryRow } from '@/lib/db';
import { hashPassword, createToken, logActivity } from '@/lib/auth';
import { getSettingBool, getSettingNumber } from '@/lib/settings';

export async function POST(request: NextRequest) {
  try {
    if (!(await getSettingBool('allow_registration'))) {
      return NextResponse.json(
        { error: 'Registration is currently disabled.' },
        { status: 403 }
      );
    }

    const { name, email, password } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'A valid email is required' },
        { status: 400 }
      );
    }

    const minPwdLen = await getSettingNumber('min_password_length', 6);
    if (!password || password.length < minPwdLen) {
      return NextResponse.json(
        { error: `Password must be at least ${minPwdLen} characters` },
        { status: 400 }
      );
    }

    const existing = await queryRow<{ id: number }>(
      'SELECT id FROM users WHERE email = ?',
      email.toLowerCase().trim()
    );

    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    let result;
    try {
      result = await exec(
        'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
        name.trim(),
        email.toLowerCase(),
        passwordHash
      );
    } catch (e: any) {
      if (e.message?.includes('UNIQUE constraint')) {
        return NextResponse.json(
          { error: 'An account with this email already exists' },
          { status: 409 }
        );
      }
      throw e;
    }

    const userId = Number(result.lastInsertRowid ?? 0);

    const ip =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown';
    await logActivity(userId, 'register', 'User registered', ip);

    const token = await createToken({
      userId,
      email: email.toLowerCase(),
      role: 'user',
      status: 'active',
    });

    const isProduction = process.env.NODE_ENV === 'production';

    const user = await queryRow<any>(
      'SELECT id, name, email, role, avatar_url, created_at FROM users WHERE id = ?',
      userId
    );

    const response = NextResponse.json({ user }, { status: 201 });

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
