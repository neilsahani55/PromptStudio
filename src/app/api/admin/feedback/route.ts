import { NextRequest, NextResponse } from 'next/server';
import { exec, queryRow, queryRows } from '@/lib/db';
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

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const type = searchParams.get('type');

    let query = `
      SELECT f.*, u.name as user_name, u.email as user_email
      FROM feedback f
      LEFT JOIN users u ON f.user_id = u.id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (status) {
      query += ' AND f.status = ?';
      params.push(status);
    }

    if (type) {
      query += ' AND f.type = ?';
      params.push(type);
    }

    query += ' ORDER BY f.created_at DESC';

    const feedback = await queryRows<any>(query, ...params);

    return NextResponse.json({ feedback });
  } catch (error) {
    console.error('Admin feedback GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (!auth) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id, status, admin_note } = await request.json();

    if (!id || typeof id !== 'number') {
      return NextResponse.json({ error: 'Feedback id is required' }, { status: 400 });
    }

    if (status && !['new', 'reviewing', 'resolved', 'dismissed'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status value' }, { status: 400 });
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
    }

    if (admin_note !== undefined) {
      updates.push('admin_note = ?');
      params.push(admin_note);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    // Stamp the admin response time and clear user_viewed_at so the user sees
    // a fresh notification about this update.
    updates.push("admin_responded_at = datetime('now')");
    updates.push('user_viewed_at = NULL');

    params.push(id);

    const updateResult = await exec(
      `UPDATE feedback SET ${updates.join(', ')} WHERE id = ?`,
      ...params
    );

    if (updateResult.changes === 0) {
      return NextResponse.json({ error: 'Feedback not found' }, { status: 404 });
    }

    const feedback = await queryRow<any>(
      `SELECT f.*, u.name as user_name, u.email as user_email
       FROM feedback f
       LEFT JOIN users u ON f.user_id = u.id
       WHERE f.id = ?`,
      id
    );

    return NextResponse.json({ feedback });
  } catch (error) {
    console.error('Admin feedback PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
