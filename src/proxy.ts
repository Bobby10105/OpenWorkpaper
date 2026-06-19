import { NextRequest, NextResponse } from 'next/server';
import { decrypt } from '@/lib/auth';

/**
 * Next.js Proxy for Authentication and Authorization logic.
 * This was previously called 'middleware'.
 */
export async function proxy(request: NextRequest) {
  const session = request.cookies.get('session')?.value;
  const { pathname } = request.nextUrl;

  const response = NextResponse.next();

  // Authentication Logic
  // Paths that don't require authentication
  const isPublicPath = 
    pathname === '/login' || 
    pathname.startsWith('/api/login') || 
    pathname.startsWith('/api/auth/sso') ||
    pathname.startsWith('/_next') || 
    pathname === '/favicon.ico';

  // If user is logged in and trying to access login page, redirect to home
  if (pathname === '/login' && session) {
    try {
      await decrypt(session);
      return NextResponse.redirect(new URL('/', request.url));
    } catch {
      // Session invalid or expired, proceed to login page
    }
  }

  if (isPublicPath) {
    return response;
  }

  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const decrypted = await decrypt(session);
    const user = (decrypted as { user: { mustChangePassword?: boolean } }).user;

    // Check if user must change password
    if (user?.mustChangePassword && 
        !pathname.startsWith('/api/') &&
        pathname !== '/settings/password' && 
        pathname !== '/api/logout') {
      return NextResponse.redirect(new URL('/settings/password', request.url));
    }

    return response;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '';
    if (!message.includes('signature') && !message.includes('expired')) {
      console.error('[Proxy] Session decryption failed:', error);
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: ['/((?!api/login|_next/static|_next/image|favicon.ico).*)'],
};
