// This file is for SERVER-ONLY operations (API routes, Server Components)
// Do NOT import this in middleware

import bcrypt from 'bcryptjs';
import { query, safeQuery, closePool } from './db';
import { User, UserRole } from '@/types';
import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const TOKEN_EXPIRY = '7d';

// Get secret key as Uint8Array for jose
function getSecretKey(): Uint8Array {
  return new TextEncoder().encode(JWT_SECRET);
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
}

// ============================================
// SERVER-ONLY FUNCTIONS (use bcrypt)
// ============================================

// Hash password - SERVER ONLY
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

// Verify password - SERVER ONLY
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

// ============================================
// EDGE-COMPATIBLE FUNCTIONS (use jose)
// ============================================

// Generate JWT token - Edge compatible
export async function generateToken(user: { id: string; email: string; role: UserRole }): Promise<string> {
  const payload: TokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };
  
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(getSecretKey());
  
  return token;
}

// Verify JWT token - Edge compatible
export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    const { userId, email, role } = payload as any;
    
    if (!userId || !email || !role) {
      return null;
    }
    
    return {
      userId,
      email,
      role
    };
  } catch {
    return null;
  }
}

// ============================================
// DATABASE FUNCTIONS (Server only - uses query)
// ============================================

// Get user by email - with retry logic
export async function getUserByEmail(email: string): Promise<any> {
  try {
    const result = await safeQuery(
      'SELECT * FROM users WHERE email = $1 AND is_active = true',
      [email]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error fetching user by email:', error);
    // Try one more time with a fresh connection
    await closePool();
    const result = await query(
      'SELECT * FROM users WHERE email = $1 AND is_active = true',
      [email]
    );
    return result.rows[0] || null;
  }
}

// Get user by id - with retry logic
export async function getUserById(userId: string): Promise<any> {
  try {
    const result = await safeQuery(
      'SELECT id, name, email, role, organization_id, is_active, last_login, created_at FROM users WHERE id = $1',
      [userId]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error fetching user by id:', error);
    // Try one more time with a fresh connection
    await closePool();
    const result = await query(
      'SELECT id, name, email, role, organization_id, is_active, last_login, created_at FROM users WHERE id = $1',
      [userId]
    );
    return result.rows[0] || null;
  }
}

// Get current user from session cookie
export async function getCurrentUser(): Promise<any> {
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  
  if (!token) return null;
  
  const payload = await verifyToken(token);
  if (!payload) return null;
  
  const user = await getUserById(payload.userId);
  if (!user) return null;
  
  return user;
}

// Create session
export async function createSession(
  userId: string,
  token: string,
  expiresAt: Date,
  userAgent?: string
): Promise<void> {
  await query(
    `INSERT INTO sessions (id, user_id, token, expires_at, user_agent)
     VALUES (gen_random_uuid(), $1, $2, $3, $4)`,
    [userId, token, expiresAt, userAgent || null]
  );
}

// Update last login
export async function updateLastLogin(userId: string): Promise<void> {
  await query(
    'UPDATE users SET last_login = NOW() WHERE id = $1',
    [userId]
  );
}

// Set auth cookie
export async function setAuthCookie(token: string): Promise<void> {
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  cookieStore.set('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });
}

// Clear auth cookie
export async function clearAuthCookie(): Promise<void> {
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  cookieStore.delete('auth_token');
}

// Logout
export async function logout(token: string): Promise<void> {
  await query('DELETE FROM sessions WHERE token = $1', [token]);
  await clearAuthCookie();
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

// ============================================
// AUTH MIDDLEWARE HELPERS
// ============================================

// Get user from request (for API routes)
export async function getUserFromRequest(request: Request): Promise<any> {
  const { cookies } = await import('next/headers');
  // For API routes, we need to extract the cookie from the request
  const cookieHeader = request.headers.get('cookie') || '';
  const cookieMatch = cookieHeader.match(/auth_token=([^;]+)/);
  const token = cookieMatch ? cookieMatch[1] : null;
  
  if (!token) return null;
  
  const payload = await verifyToken(token);
  if (!payload) return null;
  
  const user = await getUserById(payload.userId);
  if (!user) return null;
  
  return user;
}

export default {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  getUserByEmail,
  getUserById,
  getCurrentUser,
  getUserFromRequest,
  createSession,
  updateLastLogin,
  setAuthCookie,
  clearAuthCookie,
  logout,
  hasPermission,
};