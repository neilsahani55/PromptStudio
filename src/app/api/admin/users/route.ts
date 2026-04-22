import { NextRequest, NextResponse } from 'next/server';
import { exec, queryRow, queryRows } from '@/lib/db';
import { verifyToken, hashPassword, logActivity } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const auth = await verifyToken(token);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');

    let query = `
      SELECT
        u.id, u.name, u.email, u.role, u.status, u.avatar_url, u.created_at, u.last_login,
        COUNT(al.id) as activity_count,
        MAX(al.created_at) as last_activity
      FROM users u
      LEFT JOIN activity_log al ON u.id = al.user_id
    `;

    const params: any[] = [];

    if (search) {
      query += ' WHERE u.name LIKE ? OR u.email LIKE ?';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' GROUP BY u.id ORDER BY u.created_at DESC';

    const users = await queryRows<any>(query, ...params);

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Admin users error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const auth = await verifyToken(token);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { name, email, password, role } = await request.json();

    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { error: 'All fields are required: name, email, password, role' },
        { status: 400 }
      );
    }

    if (!['user', 'admin'].includes(role)) {
      return NextResponse.json(
        { error: 'Role must be "user" or "admin"' },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    const existing = await queryRow<{ id: number }>(
      'SELECT id FROM users WHERE email = ?',
      email
    );
    if (existing) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 409 }
      );
    }

    const hashedPassword = await hashPassword(password);

    let result;
    try {
      result = await exec(
        'INSERT INTO users (name, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?)',
        name.trim(),
        email.toLowerCase(),
        hashedPassword,
        role,
        'active'
      );
    } catch (e: any) {
      if (e.message?.includes('UNIQUE constraint')) {
        return NextResponse.json(
          { error: 'A user with this email already exists' },
          { status: 409 }
        );
      }
      throw e;
    }

    await logActivity(auth.userId, 'admin_create_user', `Created user ${email} with role ${role}`);

    const createdUser = await queryRow<any>(
      'SELECT id, name, email, role, status, avatar_url, created_at, last_login FROM users WHERE id = ?',
      Number(result.lastInsertRowid ?? 0)
    );

    return NextResponse.json({ user: createdUser }, { status: 201 });
  } catch (error) {
    console.error('Admin create user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
