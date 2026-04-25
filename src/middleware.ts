import { NextRequest, NextResponse } from 'next/server';
import { decrypt } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const session = request.cookies.get('session')?.value;
  const { pathname } = request.nextUrl;

  // 1. Setup Response and Security Headers
  let response = NextResponse.next();
  
  // Security Headers (NIST/OMB M-15-13 Compliance)
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: /uploads/; font-src 'self'; connect-src 'self'; frame-ancestors 'none';"
  );

  // 2. Authentication Logic
  // Paths that don't require authentication
  const isPublicPath = 
    pathname === '/login' || 
    pathname.startsWith('/api/login') || 
    pathname.startsWith('/api/auth/sso') ||
    pathname.startsWith('/_next') || 
    pathname === '/favicon.ico' ||
    pathname.startsWith('/uploads');

  // If user is logged in and trying to access login page, redirect to home
  if (pathname === '/login' && session) {
    try {
      await decrypt(session);
      return NextResponse.redirect(new URL('/', request.url));
    } catch (error) {
      // Session invalid or expired, proceed to login page
    }
  }

  if (isPublicPath) {
    return response;
  }

  if (!session) {
    const loginUrl = new URL('/login', request.url);
    const redirectResponse = NextResponse.redirect(loginUrl);
    // Copy headers to the redirect response
    response.headers.forEach((value, key) => {
      redirectResponse.headers.set(key, value);
    });
    return redirectResponse;
  }

  try {
    const decrypted = await decrypt(session);
    const user = (decrypted as any).user;

    // Check if user must change password
    if (user?.mustChangePassword && 
        pathname !== '/settings/password' && 
        pathname !== '/api/user/change-password' &&
        pathname !== '/api/logout') {
      const passwordUrl = new URL('/settings/password', request.url);
      const redirectResponse = NextResponse.redirect(passwordUrl);
      response.headers.forEach((value, key) => {
        redirectResponse.headers.set(key, value);
      });
      return redirectResponse;
    }

    return response;
  } catch (error: any) {
    if (!error.message.includes('signature') && !error.message.includes('expired')) {
      console.error('[Middleware] Session decryption failed:', error);
    }
    const loginUrl = new URL('/login', request.url);
    const redirectResponse = NextResponse.redirect(loginUrl);
    response.headers.forEach((value, key) => {
      redirectResponse.headers.set(key, value);
    });
    return redirectResponse;
  }
}

export const config = {
  matcher: ['/((?!api/login|_next/static|_next/image|favicon.ico).*)'],
};
