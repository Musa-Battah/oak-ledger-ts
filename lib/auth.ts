// This file is for SERVER-ONLY operations (API routes, Server Components)
// Do NOT import this in middleware

import bcrypt from 'bcryptjs';
import { query, safeQuery, closePool } from './db';
import { User, UserRole, Organization } from '@/types';
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
  organizationId: string;
}

// ============================================
// SERVER-ONLY FUNCTIONS (use bcrypt)
// ============================================

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

// ============================================
// EDGE-COMPATIBLE FUNCTIONS (use jose)
// ============================================

export async function generateToken(user: { id: string; email: string; role: UserRole; organizationId: string }): Promise<string> {
  const payload: TokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    organizationId: user.organizationId,
  };
  
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(getSecretKey());
  
  return token;
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    const { userId, email, role, organizationId } = payload as any;
    
    if (!userId || !email || !role || !organizationId) {
      return null;
    }
    
    return {
      userId,
      email,
      role,
      organizationId
    };
  } catch {
    return null;
  }
}

// ============================================
// DATABASE FUNCTIONS (Server only - uses query)
// ============================================

export async function getUserByEmail(email: string): Promise<any> {
  try {
    const result = await safeQuery(
      `SELECT u.*, o.id as org_id, o.name as org_name, o.email as org_email 
       FROM users u
       LEFT JOIN organizations o ON u.organization_id = o.id
       WHERE u.email = $1 AND u.is_active = true`,
      [email]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error fetching user by email:', error);
    await closePool();
    const result = await query(
      `SELECT u.*, o.id as org_id, o.name as org_name, o.email as org_email 
       FROM users u
       LEFT JOIN organizations o ON u.organization_id = o.id
       WHERE u.email = $1 AND u.is_active = true`,
      [email]
    );
    return result.rows[0] || null;
  }
}

export async function getUserById(userId: string): Promise<any> {
  try {
    const result = await safeQuery(
      `SELECT u.id, u.name, u.email, u.role, u.organization_id, u.is_active, u.last_login, u.created_at,
              o.id as org_id, o.name as org_name, o.email as org_email, o.address as org_address
       FROM users u
       LEFT JOIN organizations o ON u.organization_id = o.id
       WHERE u.id = $1`,
      [userId]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error fetching user by id:', error);
    await closePool();
    const result = await query(
      `SELECT u.id, u.name, u.email, u.role, u.organization_id, u.is_active, u.last_login, u.created_at,
              o.id as org_id, o.name as org_name, o.email as org_email, o.address as org_address
       FROM users u
       LEFT JOIN organizations o ON u.organization_id = o.id
       WHERE u.id = $1`,
      [userId]
    );
    return result.rows[0] || null;
  }
}

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

export async function updateLastLogin(userId: string): Promise<void> {
  await query(
    'UPDATE users SET last_login = NOW() WHERE id = $1',
    [userId]
  );
}

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

export async function clearAuthCookie(): Promise<void> {
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  cookieStore.delete('auth_token');
}

export async function logout(token: string): Promise<void> {
  await query('DELETE FROM sessions WHERE token = $1', [token]);
  await clearAuthCookie();
}

export function hasPermission(user: any, requiredRole: UserRole): boolean {
  if (!user) return false;
  
  const roleHierarchy: Record<UserRole, number> = {
    admin: 3,
    accountant: 2,
    viewer: 1,
  };
  
  return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
}

// Get current user's organization ID (for filtering)
export async function getCurrentOrganizationId(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.organization_id || null;
}

export default {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  getUserByEmail,
  getUserById,
  getCurrentUser,
  getCurrentOrganizationId,
  createSession,
  updateLastLogin,
  setAuthCookie,
  clearAuthCookie,
  logout,
  hasPermission,
}; 