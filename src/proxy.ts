import { NextRequest, NextResponse } from 'next/server';
import { decrypt } from '@/lib/auth';

function isPublicPath(pathname: string) {
  return pathname === '/login' ||
    pathname.startsWith('/api/login') || 
    pathname.startsWith('/api/auth/sso') ||
    pathname.startsWith('/_next') || 
    pathname === '/favicon.ico';
}

async function handleLoginAccess(request: NextRequest, session: string | undefined, pathname: string) {
  if (pathname === '/login' && session) {
    try {
      await decrypt(session);
      return NextResponse.redirect(new URL('/', request.url));
    } catch {
      // Session invalid or expired, proceed to login page
    }
  }
  return null;
}

async function verifyAuth(request: NextRequest, session: string, pathname: string, response: NextResponse) {
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

/**
 * Next.js Proxy for Authentication and Authorization logic.
 * This was previously called 'middleware'.
 */
export async function proxy(request: NextRequest) {
  const session = request.cookies.get('session')?.value;
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();

  const loginRedirect = await handleLoginAccess(request, session, pathname);
  if (loginRedirect) return loginRedirect;

  if (isPublicPath(pathname)) {
    return response;
  }

  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return verifyAuth(request, session, pathname, response);
}

export const config = {
  matcher: ['/((?!api/login|_next/static|_next/image|favicon.ico).*)'],
};
