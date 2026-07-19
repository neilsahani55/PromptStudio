import { NextResponse } from 'next/server';

// Email/password self-registration is permanently disabled: any unverified
// address could sign up. Accounts are now created via Google sign-in
// (verified emails only) or by an admin in /admin/users.
export async function POST() {
  return NextResponse.json(
    {
      error:
        'Email registration is disabled. Please sign in with Google — your account is created automatically.',
    },
    { status: 403 }
  );
}
