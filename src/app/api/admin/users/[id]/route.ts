import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { exec, queryRow } from '@/lib/db';
import { verifyToken, hashPassword, logActivity } from '@/lib/auth';

async function requireAdmin(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) return null;
  const auth = await verifyToken(token);
  if (!auth || auth.role !== 'admin') return null;
  return auth;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin(request);
    if (!auth) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }
    const body = await request.json();
    const { role, status, name } = body;

    if (auth.userId === userId) {
      if (status === 'blocked') {
        return NextResponse.json({ error: 'You cannot block yourself' }, { status: 400 });
      }
      if (role && role !== 'admin') {
        return NextResponse.json({ error: 'You cannot demote yourself' }, { status: 400 });
      }
    }

    const validRoles = ['user', 'admin'];
    const validStatuses = ['active', 'blocked'];

    if (role !== undefined && !validRoles.includes(role)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${validRoles.join(', ')}` },
        { status: 400 }
      );
    }
    if (status !== undefined && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    const setClauses: string[] = [];
    const values: any[] = [];

    if (role !== undefined) {
      setClauses.push('role = ?');
      values.push(role);
    }
    if (status !== undefined) {
      setClauses.push('status = ?');
      values.push(status);
    }
    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return NextResponse.json(
          { error: 'Name must be a non-empty string' },
          { status: 400 }
        );
      }
      setClauses.push('name = ?');
      values.push(name.trim());
    }

    if (setClauses.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    values.push(userId);
    const query = `UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`;
    const result = await exec(query, ...values);

    if (result.changes === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const changes: string[] = [];
    if (role !== undefined) changes.push(`role=${role}`);
    if (status !== undefined) changes.push(`status=${status}`);
    if (name !== undefined) changes.push(`name=${name}`);
    await logActivity(auth.userId, 'admin_update_user', `Updated user ${userId}: ${changes.join(', ')}`);

    const updatedUser = await queryRow<any>(
      'SELECT id, name, email, role, status, avatar_url, created_at, last_login FROM users WHERE id = ?',
      userId
    );

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error('Admin update user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin(request);
    if (!auth) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    if (auth.userId === userId) {
      return NextResponse.json({ error: 'You cannot delete yourself' }, { status: 400 });
    }

    const result = await exec('DELETE FROM users WHERE id = ?', userId);

    if (result.changes === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    await logActivity(auth.userId, 'admin_delete_user', `Deleted user ${userId}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin delete user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin(request);
    if (!auth) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }
    const body = await request.json();

    if (body.action !== 'reset-password') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const targetUser = await queryRow<{ id: number }>(
      'SELECT id FROM users WHERE id = ?',
      userId
    );
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const temporaryPassword = crypto.randomBytes(9).toString('base64').slice(0, 12);

    const hashedPassword = await hashPassword(temporaryPassword);
    await exec('UPDATE users SET password_hash = ? WHERE id = ?', hashedPassword, userId);

    await logActivity(auth.userId, 'admin_reset_password', `Reset password for user ${userId}`);

    return NextResponse.json({ temporaryPassword });
  } catch (error) {
    console.error('Admin reset password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
