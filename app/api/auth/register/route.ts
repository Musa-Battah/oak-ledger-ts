import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { hashPassword, generateToken, createSession, setAuthCookie, updateLastLogin } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, organization_name } = await request.json();
    
    // Validate input
    if (!name || !email || !password || !organization_name) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }
    
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }
    
    // Check if user exists
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    
    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 400 }
      );
    }
    
    // Create organization
    const orgId = uuidv4();
    await query(
      `INSERT INTO organizations (id, name, email)
       VALUES ($1, $2, $3)`,
      [orgId, organization_name, email]
    );
    
    // Create user
    const userId = uuidv4();
    const passwordHash = await hashPassword(password);
    
    await query(
      `INSERT INTO users (id, name, email, password_hash, role, organization_id, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, true)`,
      [userId, name, email, passwordHash, 'admin', orgId]
    );
    
    // Generate token
    const token = generateToken({ id: userId, email, role: 'admin' });
    
    // Create session
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    
    await createSession(userId, token, expiresAt);
    
    // Set cookie
    await setAuthCookie(token);
    
    // Update last login
    await updateLastLogin(userId);
    
    // Get user data
    const userResult = await query(
      'SELECT id, name, email, role, organization_id, created_at FROM users WHERE id = $1',
      [userId]
    );
    
    return NextResponse.json({
      success: true,
      user: userResult.rows[0],
      token,
      message: 'Registration successful'
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    );
  }
}