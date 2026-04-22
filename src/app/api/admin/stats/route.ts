import { NextRequest, NextResponse } from 'next/server';
import { queryRow, queryRows } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

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

    const totalUsersRow = await queryRow<{ count: number | bigint }>(
      'SELECT COUNT(*) as count FROM users'
    );
    const totalUsers = Number(totalUsersRow?.count ?? 0);

    const newTodayRow = await queryRow<{ count: number | bigint }>(
      "SELECT COUNT(*) as count FROM users WHERE date(created_at) = date('now')"
    );
    const newToday = Number(newTodayRow?.count ?? 0);

    const activeRow = await queryRow<{ count: number | bigint }>(
      "SELECT COUNT(DISTINCT user_id) as count FROM activity_log WHERE created_at >= datetime('now', '-24 hours')"
    );
    const activeUsers = Number(activeRow?.count ?? 0);

    const feedbackRows = await queryRows<{ status: string; count: number | bigint }>(
      'SELECT status, COUNT(*) as count FROM feedback GROUP BY status'
    );

    const feedbackByStatus: Record<string, number> = {
      new: 0,
      reviewing: 0,
      resolved: 0,
      dismissed: 0,
    };

    let totalFeedback = 0;
    for (const row of feedbackRows) {
      feedbackByStatus[row.status] = Number(row.count);
      totalFeedback += Number(row.count);
    }

    const pendingFeedback = feedbackByStatus.new + feedbackByStatus.reviewing;
    const resolvedFeedback = feedbackByStatus.resolved;

    const rawActivity = await queryRows<any>(
      `SELECT al.id, al.action, al.details, al.created_at,
              u.name as user_name
       FROM activity_log al
       LEFT JOIN users u ON al.user_id = u.id
       ORDER BY al.created_at DESC
       LIMIT 20`
    );

    const recentActivity = rawActivity.map((a) => ({
      id: String(a.id),
      userName: a.user_name || 'Unknown',
      action: a.action,
      details: a.details || '',
      timestamp: a.created_at,
    }));

    return NextResponse.json({
      totalUsers,
      newToday,
      activeUsers,
      totalFeedback,
      pendingFeedback,
      resolvedFeedback,
      feedbackByStatus,
      recentActivity,
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
