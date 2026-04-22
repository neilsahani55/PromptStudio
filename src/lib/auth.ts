import bcryptjs from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { queryRow, exec } from './db';

const AUTH_SECRET = process.env.AUTH_SECRET;
if (!AUTH_SECRET) {
  console.error('CRITICAL: AUTH_SECRET environment variable is not set. Using insecure default. Set AUTH_SECRET in .env.local for production.');
}
const secret = new TextEncoder().encode(AUTH_SECRET || 'promptstudio-default-secret-change-in-production');

export type User = {
  id: number;
  name: string;
  email: string;
  role: string;
  avatar_url: string | null;
  created_at: string;
};

export async function hashPassword(password: string): Promise<string> {
  return bcryptjs.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcryptjs.compare(password, hash);
}

export async function createToken(payload: {
  userId: number;
  email: string;
  role: string;
  status?: string;
}): Promise<string> {
  return new SignJWT({ ...payload, status: payload.status || 'active' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);
}

export async function verifyToken(
  token: string
): Promise<{ userId: number; email: string; role: string; status: string } | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return {
      userId: payload.userId as number,
      email: payload.email as string,
      role: payload.role as string,
      status: (payload.status as string) || 'active',
    };
  } catch {
    return null;
  }
}

export async function getSession(cookies: any): Promise<User | null> {
  const token = cookies.get('auth-token')?.value;
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  return queryRow<User>(
    'SELECT id, name, email, role, avatar_url, created_at FROM users WHERE id = ?',
    payload.userId
  );
}

export async function logActivity(
  userId: number,
  action: string,
  details?: string,
  ip?: string
): Promise<void> {
  await exec(
    'INSERT INTO activity_log (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)',
    userId,
    action,
    details || null,
    ip || null
  );
}
