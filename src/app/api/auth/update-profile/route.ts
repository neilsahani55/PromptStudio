import { NextRequest, NextResponse } from 'next/server';
import { exec, queryRow } from '@/lib/db';
import { verifyToken, verifyPassword, hashPassword, logActivity } from '@/lib/auth';
import { getSettingNumber } from '@/lib/settings';

export async function PATCH(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const auth = await verifyToken(token);
    if (!auth) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { name, currentPassword, newPassword } = await request.json();
    const ip =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown';

    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return NextResponse.json({ error: 'Name must be a non-empty string' }, { status: 400 });
      }
      await exec('UPDATE users SET name = ? WHERE id = ?', name.trim(), auth.userId);
      await logActivity(auth.userId, 'profile_updated', 'Name updated', ip);
    }

    if (currentPassword && newPassword) {
      const user = await queryRow<{ password_hash: string }>(
        'SELECT password_hash FROM users WHERE id = ?',
        auth.userId
      );

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const valid = await verifyPassword(currentPassword, user.password_hash);
      if (!valid) {
        return NextResponse.json(
          { error: 'Current password is incorrect' },
          { status: 400 }
        );
      }

      const minLen = await getSettingNumber('min_password_length', 6);
      if (newPassword.length < minLen) {
        return NextResponse.json(
          { error: `New password must be at least ${minLen} characters` },
          { status: 400 }
        );
      }

      const hashed = await hashPassword(newPassword);
      await exec('UPDATE users SET password_hash = ? WHERE id = ?', hashed, auth.userId);
      await logActivity(auth.userId, 'password_changed', 'Password updated', ip);
    }

    const updatedUser = await queryRow<any>(
      'SELECT id, name, email, role, avatar_url, created_at FROM users WHERE id = ?',
      auth.userId
    );

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
