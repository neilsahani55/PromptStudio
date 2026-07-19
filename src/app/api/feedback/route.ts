import { NextRequest, NextResponse } from 'next/server';
import { exec, queryRow, queryRows } from '@/lib/db';
import { verifyToken, logActivity } from '@/lib/auth';
import { sendFeedbackEmail } from '@/lib/mailer';

export const runtime = 'nodejs';

async function getAuthUser(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { type, title, message } = await request.json();

    if (!type || !['bug', 'suggestion', 'improvement'].includes(type)) {
      return NextResponse.json(
        { error: 'Type must be one of: bug, suggestion, improvement' },
        { status: 400 }
      );
    }

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const result = await exec(
      `INSERT INTO feedback (user_id, user_name, type, title, message)
       VALUES (?, (SELECT name FROM users WHERE id = ?), ?, ?, ?)`,
      auth.userId,
      auth.userId,
      type,
      title.trim(),
      message.trim()
    );

    const feedback = await queryRow<any>(
      'SELECT * FROM feedback WHERE id = ?',
      Number(result.lastInsertRowid ?? 0)
    );

    const ip =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown';
    await logActivity(auth.userId, 'feedback_submitted', `Submitted ${type}: ${title}`, ip);

    // Email notification (best-effort — never fails the request). Awaited
    // because serverless functions can't reliably finish fire-and-forget work.
    const submitter = await queryRow<{ name: string; email: string }>(
      'SELECT name, email FROM users WHERE id = ?',
      auth.userId
    );
    await sendFeedbackEmail({
      id: Number(result.lastInsertRowid ?? 0),
      type,
      title: title.trim(),
      message: message.trim(),
      userName: submitter?.name,
      userEmail: submitter?.email,
    });

    return NextResponse.json({ feedback }, { status: 201 });
  } catch (error) {
    console.error('Feedback POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const feedback = await queryRows<any>(
      'SELECT * FROM feedback WHERE user_id = ? ORDER BY created_at DESC',
      auth.userId
    );

    return NextResponse.json({ feedback });
  } catch (error) {
    console.error('Feedback GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
