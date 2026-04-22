import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, logActivity } from '@/lib/auth';
import { getAllSettings, setSetting } from '@/lib/settings';

const ALLOWED_SETTINGS_KEYS = new Set([
  'rate_limit_max', 'rate_limit_window_minutes', 'min_password_length',
  'maintenance_mode', 'maintenance_message', 'default_model',
  'allow_registration', 'announcement_active', 'announcement_text', 'announcement_type',
]);

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

    const settings = await getAllSettings();
    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Admin settings GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const auth = await verifyToken(token);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();

    if (body.settings && typeof body.settings === 'object') {
      for (const [key, value] of Object.entries(body.settings)) {
        if (!ALLOWED_SETTINGS_KEYS.has(key)) continue;
        await setSetting(key, String(value));
      }
      await logActivity(
        auth.userId,
        'settings_updated',
        `Bulk updated: ${Object.keys(body.settings).join(', ')}`
      );
    } else if (body.key && body.value !== undefined) {
      if (!ALLOWED_SETTINGS_KEYS.has(body.key)) {
        return NextResponse.json({ error: 'Invalid setting key' }, { status: 400 });
      }
      await setSetting(body.key, String(body.value));
      await logActivity(auth.userId, 'setting_updated', `${body.key} = ${body.value}`);
    } else {
      return NextResponse.json(
        { error: 'Invalid request body. Provide { key, value } or { settings: Record<string, string> }' },
        { status: 400 }
      );
    }

    const settings = await getAllSettings();
    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Admin settings PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
