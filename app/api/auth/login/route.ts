import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword, generateToken, createSession, setAuthCookie, updateLastLogin, getUserByEmail } from '@/lib/auth';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    
    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }
    
    // Get user
    const user = await getUserByEmail(email);
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }
    
    // Verify password
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }
    
    // Generate token
    const token = generateToken({ id: user.id, email: user.email, role: user.role });
    
    // Create session
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    
    await createSession(
      user.id,
      token,
      expiresAt,
      request.headers.get('user-agent') || undefined
    );
    
    // Set cookie
    setAuthCookie(token);
    
    // Update last login
    await updateLastLogin(user.id);
    
    // Get user data
    const userResult = await query(
      'SELECT id, name, email, role, organization_id, created_at FROM users WHERE id = $1',
      [user.id]
    );
    
    return NextResponse.json({
      success: true,
      user: userResult.rows[0],
      token,
      message: 'Login successful'
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}