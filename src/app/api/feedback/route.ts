import { NextRequest, NextResponse } from 'next/server';
import { exec, queryRow, queryRows } from '@/lib/db';
import { verifyToken, logActivity } from '@/lib/auth';

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
      'INSERT INTO feedback (user_id, type, title, message) VALUES (?, ?, ?, ?)',
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
