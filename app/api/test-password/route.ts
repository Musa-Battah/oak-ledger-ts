import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, verifyPassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    
    // Get user
    const user = await getUserByEmail(email);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Test password verification
    const isValid = await verifyPassword(password, user.password_hash);
    
    return NextResponse.json({
      email: user.email,
      password_hash: user.password_hash,
      hash_length: user.password_hash.length,
      hash_starts_with: user.password_hash.substring(0, 10),
      isValid,
      message: isValid ? 'Password is valid!' : 'Password is invalid'
    });
  } catch (error) {
    console.error('Test password error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}