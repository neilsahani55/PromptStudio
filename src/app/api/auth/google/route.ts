import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Starts the Google OAuth flow: sets a CSRF state cookie and redirects to
// Google's consent screen. Redirect URI is derived from the request origin so
// the same code works on localhost and production.
export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(
      new URL('/login?error=google_not_configured', req.url)
    );
  }

  const state = crypto.randomUUID();
  const redirectUri = `${req.nextUrl.origin}/api/auth/google/callback`;

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'openid email profile');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('prompt', 'select_account');

  const res = NextResponse.redirect(authUrl);
  res.cookies.set('google-oauth-state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600, // 10 minutes
  });
  return res;
}
