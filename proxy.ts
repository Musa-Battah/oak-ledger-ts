import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyTokenEdge } from '@/lib/auth-edge';

// Public routes that don't require authentication
const publicRoutes = ['/', '/login', '/register', '/api/auth/login', '/api/auth/register', '/api/auth/me', '/api/test-password'];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Check if route is public
  const isPublicRoute = publicRoutes.some(route => pathname === route || pathname.startsWith('/api/auth'));
  
  // Allow public routes
  if (isPublicRoute) {
    return NextResponse.next();
  }
  
  // Check for auth token
  const token = request.cookies.get('auth_token')?.value;
  
  // If no token and trying to access protected route
  if (!token) {
    // Redirect to login for page routes
    if (!pathname.startsWith('/api')) {
      const loginUrl = new URL('/login', request.url);
      // Pass the current path as returnUrl so user can be redirected back after login
      loginUrl.searchParams.set('returnUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
    // Return 401 for API routes
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  
  // Verify token using Edge-compatible function (no bcrypt)
  const payload = await verifyTokenEdge(token);
  if (!payload) {
    // Clear invalid cookie
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('auth_token');
    return response;
  }
  
  // Allow access
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public|assets).*)',
  ],
};