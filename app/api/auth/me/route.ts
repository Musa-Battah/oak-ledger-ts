import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, requireAuth } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const authCheck = await requireAuth(request);
    if (authCheck) return authCheck;
    
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Get organization data
    let organization = null;
    if (user.organization_id) {
      const orgResult = await query(
        'SELECT * FROM organizations WHERE id = $1',
        [user.organization_id]
      );
      if (orgResult.rows.length > 0) {
        organization = orgResult.rows[0];
      }
    }
    
    return NextResponse.json({
      success: true,
      user: {
        ...user,
        organization
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: 'Failed to get user data' },
      { status: 500 }
    );
  }
}