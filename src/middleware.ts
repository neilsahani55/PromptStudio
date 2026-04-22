import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const AUTH_SECRET = process.env.AUTH_SECRET;
if (!AUTH_SECRET) {
  console.error('CRITICAL: AUTH_SECRET environment variable is not set.');
}
const secret = new TextEncoder().encode(AUTH_SECRET || 'promptstudio-default-secret-change-in-production');

const publicPaths = ['/login', '/register'];
const authApiPrefix = '/api/auth';

// Check if the pathname looks like a static file (has a file extension at the end)
function isStaticFile(pathname: string): boolean {
  const lastSegment = pathname.split('/').pop() || '';
  return /\.\w+$/.test(lastSegment);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/apple-icon') ||
    pathname.startsWith('/icon') ||
    isStaticFile(pathname)
  ) {
    return NextResponse.next();
  }

  // Allow auth API routes and announcement API (public)
  if (pathname.startsWith(authApiPrefix) || pathname === '/api/announcement') {
    return NextResponse.next();
  }

  // Allow public paths
  if (publicPaths.some((p) => pathname === p)) {
    const token = request.cookies.get('auth-token')?.value;
    if (token) {
      try {
        const { payload } = await jwtVerify(token, secret);
        // Don't redirect blocked users — let them see login
        if (payload.status !== 'blocked') {
          return NextResponse.redirect(new URL('/', request.url));
        }
      } catch {
        // Invalid token, let them access login/register
      }
    }
    return NextResponse.next();
  }

  // All other routes require authentication
  const token = request.cookies.get('auth-token')?.value;
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const { payload } = await jwtVerify(token, secret);

    // Block blocked users
    if (payload.status === 'blocked') {
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('auth-token');
      return response;
    }

    // Admin route protection
    if (pathname.startsWith('/admin')) {
      if (payload.role !== 'admin') {
        return NextResponse.redirect(new URL('/', request.url));
      }
    }

    // Forward user info via request headers for downstream use
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', String(payload.userId ?? ''));
    requestHeaders.set('x-user-role', String(payload.role ?? ''));
    requestHeaders.set('x-user-email', String(payload.email ?? ''));

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch {
    // Invalid token
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('auth-token');
    return response;
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
