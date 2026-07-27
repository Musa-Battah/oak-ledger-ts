import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword, generateToken, setAuthCookie, updateLastLogin, getUserByEmail } from '@/lib/auth';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }
    
    const user = await getUserByEmail(email);
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }
    
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }
    
    // Generate token with organizationId
    const token = await generateToken({ 
      id: user.id, 
      email: user.email, 
      role: user.role,
      organizationId: user.organization_id 
    });
    
    await setAuthCookie(token);
    await updateLastLogin(user.id);
    
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