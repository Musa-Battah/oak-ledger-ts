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
    
    // Check if user has an organization - if not, create or assign one
    let orgId = user.organization_id;
    
    if (!orgId) {
      // Check if there's an organization with this user's name or email
      const existingOrg = await query(
        'SELECT id FROM organizations WHERE email = $1 OR name = $2 LIMIT 1',
        [user.email, `${user.name}'s Organization`]
      );
      
      if (existingOrg.rows.length > 0) {
        orgId = existingOrg.rows[0].id;
      } else {
        // Create new organization
        const newOrgId = crypto.randomUUID();
        await query(
          `INSERT INTO organizations (id, name, email)
           VALUES ($1, $2, $3)`,
          [newOrgId, `${user.name}'s Organization`, user.email]
        );
        orgId = newOrgId;
      }
      
      // Update user with organization
      await query(
        'UPDATE users SET organization_id = $1 WHERE id = $2',
        [orgId, user.id]
      );
    }
    
    // Generate token with organizationId
    const token = await generateToken({ 
      id: user.id, 
      email: user.email, 
      role: user.role,
      organizationId: orgId 
    });
    
    await setAuthCookie(token);
    await updateLastLogin(user.id);
    
    // Get fresh user data with organization
    const userResult = await query(
      `SELECT u.id, u.name, u.email, u.role, u.organization_id, o.name as org_name
       FROM users u
       LEFT JOIN organizations o ON u.organization_id = o.id
       WHERE u.id = $1`,
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