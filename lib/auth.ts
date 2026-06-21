import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { query } from './db';
import { User, UserRole } from '@/types';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const TOKEN_EXPIRY = '7d';

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

// Verify password
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

// Generate JWT token
export function generateToken(user: { id: string; email: string; role: UserRole }): string {
  const payload: TokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

// Verify JWT token
export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

// Create session
export async function createSession(
  userId: string,
  token: string,
  expiresAt: Date,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await query(
    `INSERT INTO sessions (id, user_id, token, expires_at, ip_address, user_agent)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)`,
    [userId, token, expiresAt, ipAddress || null, userAgent || null]
  );
}

// Get user by email
export async function getUserByEmail(email: string): Promise<any> {
  const result = await query(
    'SELECT * FROM users WHERE email = $1 AND is_active = true',
    [email]
  );
  return result.rows[0] || null;
}

// Get user by id
export async function getUserById(userId: string): Promise<any> {
  const result = await query(
    'SELECT id, name, email, role, organization_id, is_active, last_login, created_at FROM users WHERE id = $1',
    [userId]
  );
  return result.rows[0] || null;
}

// Get current user from session cookie
export async function getCurrentUser(): Promise<any> {
  const cookieStore = cookies();
  const token = cookieStore.get('auth_token')?.value;
  
  if (!token) return null;
  
  const payload = verifyToken(token);
  if (!payload) return null;
  
  const user = await getUserById(payload.userId);
  if (!user) return null;
  
  // Check if session exists and is valid
  const sessionResult = await query(
    'SELECT * FROM sessions WHERE token = $1 AND expires_at > NOW()',
    [token]
  );
  
  if (sessionResult.rows.length === 0) return null;
  
  return user;
}

// Update last login
export async function updateLastLogin(userId: string): Promise<void> {
  await query(
    'UPDATE users SET last_login = NOW() WHERE id = $1',
    [userId]
  );
}

// Set auth cookie
export function setAuthCookie(token: string): void {
  const cookieStore = cookies();
  cookieStore.set('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
}

// Clear auth cookie
export function clearAuthCookie(): void {
  const cookieStore = cookies();
  cookieStore.delete('auth_token');
}

// Logout
export async function logout(token: string): Promise<void> {
  await query('DELETE FROM sessions WHERE token = $1', [token]);
  clearAuthCookie();
}

// Check if user has permission
export function hasPermission(user: User | null, requiredRole: UserRole): boolean {
  if (!user) return false;
  
  const roleHierarchy: Record<UserRole, number> = {
    admin: 3,
    accountant: 2,
    viewer: 1,
  };
  
  return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
}

// Middleware to check authentication
export async function requireAuth(request: NextRequest): Promise<NextResponse | null> {
  const token = request.cookies.get('auth_token')?.value;
  
  if (!token) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  
  const payload = verifyToken(token);
  if (!payload) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
  
  // Check if session exists
  const sessionResult = await query(
    'SELECT * FROM sessions WHERE token = $1 AND expires_at > NOW()',
    [token]
  );
  
  if (sessionResult.rows.length === 0) {
    return NextResponse.json({ error: 'Session expired' }, { status: 401 });
  }
  
  return null; // User is authenticated
}

// Middleware to check role
export async function requireRole(request: NextRequest, requiredRole: UserRole): Promise<NextResponse | null> {
  const authCheck = await requireAuth(request);
  if (authCheck) return authCheck;
  
  const token = request.cookies.get('auth_token')?.value;
  if (!token) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  
  const user = await getUserById(payload.userId);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 401 });
  
  const roleHierarchy: Record<UserRole, number> = {
    admin: 3,
    accountant: 2,
    viewer: 1,
  };
  
  if (roleHierarchy[user.role] < roleHierarchy[requiredRole]) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }
  
  return null;
}