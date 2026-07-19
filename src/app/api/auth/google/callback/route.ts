import { NextRequest, NextResponse } from 'next/server';
import { queryRow, exec } from '@/lib/db';
import { createToken, logActivity } from '@/lib/auth';

export const runtime = 'nodejs';

// Emails auto-promoted to admin on Google sign-in. Comma-separated override
// via ADMIN_EMAILS env; the project owner is the default.
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'neilsahani55@gmail.com')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

const loginError = (req: NextRequest, code: string) =>
  NextResponse.redirect(new URL(`/login?error=${code}`, req.url));

export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return loginError(req, 'google_not_configured');

  const params = req.nextUrl.searchParams;
  if (params.get('error')) return loginError(req, 'google_denied');

  const code = params.get('code');
  const state = params.get('state');
  const cookieState = req.cookies.get('google-oauth-state')?.value;
  if (!code || !state || !cookieState || state !== cookieState) {
    return loginError(req, 'google_state');
  }

  try {
    // 1. Exchange the authorization code for tokens.
    const redirectUri = `${req.nextUrl.origin}/api/auth/google/callback`;
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    if (!tokenRes.ok) {
      console.error('Google token exchange failed:', await tokenRes.text());
      return loginError(req, 'google_token');
    }
    const tokens: { access_token?: string } = await tokenRes.json();
    if (!tokens.access_token) return loginError(req, 'google_token');

    // 2. Fetch the verified profile.
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (!profileRes.ok) return loginError(req, 'google_profile');
    const profile: {
      email?: string;
      email_verified?: boolean;
      name?: string;
      picture?: string;
    } = await profileRes.json();

    const email = profile.email?.toLowerCase().trim();
    if (!email || profile.email_verified === false) {
      return loginError(req, 'google_unverified');
    }
    const name = profile.name?.trim() || email.split('@')[0];
    const isAdminEmail = ADMIN_EMAILS.includes(email);

    // 3. Find or create the user.
    let user = await queryRow<{
      id: number; name: string; email: string; role: string; status: string; avatar_url: string | null;
    }>('SELECT * FROM users WHERE email = ?', email);

    if (user && user.status === 'blocked') {
      return loginError(req, 'blocked');
    }

    if (!user) {
      // Google-verified email — create the account. The placeholder password
      // hash can never match a bcrypt comparison, so password login is
      // impossible for Google-created accounts.
      const placeholder = `google-oauth:${crypto.randomUUID()}`;
      await exec(
        `INSERT INTO users (name, email, password_hash, role, status, avatar_url, auth_provider)
         VALUES (?, ?, ?, ?, 'active', ?, 'google')`,
        name,
        email,
        placeholder,
        isAdminEmail ? 'admin' : 'user',
        profile.picture ?? null
      );
      user = await queryRow('SELECT * FROM users WHERE email = ?', email);
      if (!user) return loginError(req, 'google_create');
    } else {
      // Keep profile fresh; promote configured admin emails.
      const role = isAdminEmail ? 'admin' : user.role;
      await exec(
        `UPDATE users SET last_login = now(), avatar_url = COALESCE(?, avatar_url),
           role = ?, auth_provider = 'google' WHERE id = ?`,
        profile.picture ?? null,
        role,
        user.id
      );
      user.role = role;
    }

    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    await logActivity(user.id, 'login', 'Google sign-in', ip);

    const token = await createToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      status: user.status || 'active',
    });

    const res = NextResponse.redirect(new URL('/studio', req.url));
    res.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });
    res.cookies.delete('google-oauth-state');
    return res;
  } catch (e) {
    console.error('Google OAuth callback error:', e);
    return loginError(req, 'google_error');
  }
}
