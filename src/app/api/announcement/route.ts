import { NextResponse } from 'next/server';
import { getSetting } from '@/lib/settings';

export async function GET() {
  try {
    const [activeRaw, text, typeRaw] = await Promise.all([
      getSetting('announcement_active'),
      getSetting('announcement_text'),
      getSetting('announcement_type'),
    ]);

    return NextResponse.json({
      active: activeRaw === 'true',
      text,
      type: typeRaw || 'info',
    });
  } catch (error) {
    console.error('Announcement GET error:', error);
    return NextResponse.json(
      { active: false, text: '', type: 'info' },
      { status: 500 }
    );
  }
}
