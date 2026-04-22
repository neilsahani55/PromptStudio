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

    const period = request.nextUrl.searchParams.get('period') || 'all';

    let dateFilter = '';
    switch (period) {
      case 'today':
        dateFilter = "AND date(ul.created_at) = date('now')";
        break;
      case 'week':
        dateFilter = "AND ul.created_at >= datetime('now', '-7 days')";
        break;
      case 'month':
        dateFilter = "AND ul.created_at >= datetime('now', '-30 days')";
        break;
      default:
        dateFilter = '';
    }

    const totalRow = await queryRow<{ count: number | bigint }>(
      `SELECT COUNT(*) as count FROM usage_log ul WHERE 1=1 ${dateFilter}`
    );
    const totalGenerations = Number(totalRow?.count ?? 0);

    const avgRow = await queryRow<{ avg: number | null }>(
      `SELECT AVG(duration_ms) as avg FROM usage_log ul WHERE 1=1 ${dateFilter}`
    );
    const avgDuration = Math.round(avgRow?.avg || 0);

    const byModel = await queryRows<{ model: string; count: number | bigint }>(
      `SELECT model, COUNT(*) as count FROM usage_log ul WHERE 1=1 ${dateFilter} GROUP BY model ORDER BY count DESC`
    );

    const byDay = await queryRows<{ date: string; count: number | bigint }>(
      `SELECT date(created_at) as date, COUNT(*) as count FROM usage_log ul WHERE 1=1 ${dateFilter} GROUP BY date(created_at) ORDER BY date ASC`
    );

    const inputTypeRows = await queryRows<{ input_type: string; count: number | bigint }>(
      `SELECT input_type, COUNT(*) as count FROM usage_log ul WHERE 1=1 ${dateFilter} GROUP BY input_type`
    );

    const byInputType = { text: 0, screenshot: 0 };
    for (const row of inputTypeRows) {
      if (row.input_type === 'text') byInputType.text = Number(row.count);
      else if (row.input_type === 'screenshot') byInputType.screenshot = Number(row.count);
    }

    const topUsers = await queryRows<{ name: string; email: string; count: number | bigint }>(
      `SELECT u.name, u.email, COUNT(*) as count
       FROM usage_log ul
       JOIN users u ON ul.user_id = u.id
       WHERE 1=1 ${dateFilter}
       GROUP BY ul.user_id
       ORDER BY count DESC
       LIMIT 10`
    );

    return NextResponse.json({
      totalGenerations,
      avgDuration,
      byModel: byModel.map((r) => ({ model: r.model, count: Number(r.count) })),
      byDay: byDay.map((r) => ({ date: r.date, count: Number(r.count) })),
      byInputType,
      topUsers: topUsers.map((r) => ({
        name: r.name,
        email: r.email,
        count: Number(r.count),
      })),
    });
  } catch (error) {
    console.error('Admin usage error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
