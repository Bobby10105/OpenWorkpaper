import { SignJWT, jwtVerify, JWTPayload } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const secretValue = process.env.JWT_SECRET;
if (!secretValue) {
  throw new Error('[Auth] JWT_SECRET must be set.');
}

const secretKey = new TextEncoder().encode(secretValue);
const SESSION_DURATION = parseInt(process.env.SESSION_DURATION_SECONDS || '3600', 10); // Default 1 hour

export async function encrypt(payload: JWTPayload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION}s`)
    .sign(secretKey);
}

export async function decrypt(input: string): Promise<JWTPayload> {
  try {
    const { payload } = await jwtVerify(input, secretKey, {
      algorithms: ['HS256'],
    });
    return payload;
  } catch (error: unknown) {
    const err = error as { code?: string };
    if (err.code === 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED') {
      throw new Error('Invalid session signature. The secret key may have changed.');
    }
    if (err.code === 'ERR_JWT_EXPIRED') {
      throw new Error('Session has expired.');
    }
    throw error;
  }
}

export async function getSession(): Promise<{ user: { id: string; username: string; role: string; mustChangePassword: boolean } } | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;
    if (!sessionCookie) {
      return null;
    }
    const decrypted = await decrypt(sessionCookie);
    return decrypted as unknown as { user: { id: string; username: string; role: string; mustChangePassword: boolean } };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (!message.includes('Invalid session signature') && !message.includes('expired')) {
      console.error('[Auth] Session retrieval error:', error);
    } else {
      console.debug(`[Auth] ${message}`);
    }
    return null;
  }
}

export async function login(user: { id: string; username: string; role: string; mustChangePassword: boolean }) {
  const expires = new Date(Date.now() + SESSION_DURATION * 1000);
  const session = await encrypt({ user, expires: Math.floor(expires.getTime() / 1000) });

  const cookieStore = await cookies();
  
  const isProduction = process.env.NODE_ENV === 'production';
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
  const isSecureEnv = baseUrl.startsWith('https://');

  cookieStore.set('session', session, { 
    expires, 
    httpOnly: true, 
    secure: isProduction && isSecureEnv,
    sameSite: 'lax',
    path: '/',
  });
}

export async function logout() {
  const cookieStore = await cookies();
  const isProduction = process.env.NODE_ENV === 'production';
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
  const isSecureEnv = baseUrl.startsWith('https://');

  cookieStore.set('session', '', { 
    expires: new Date(0),
    secure: isProduction && isSecureEnv,
    path: '/',
  });
}

export async function updateSession(request: NextRequest) {
  const session = request.cookies.get('session')?.value;
  if (!session) return;

  try {
    const parsed = await decrypt(session);
    const expires = new Date(Date.now() + SESSION_DURATION * 1000);
    parsed.expires = Math.floor(expires.getTime() / 1000);
    
    const isProduction = process.env.NODE_ENV === 'production';
    const isSecureEnv = request.nextUrl.protocol === 'https:';

    const res = NextResponse.next();
    res.cookies.set({
      name: 'session',
      value: await encrypt(parsed),
      httpOnly: true,
      secure: isProduction && isSecureEnv,
      expires: expires,
      sameSite: 'lax',
      path: '/',
    });
    return res;
  } catch {
    return NextResponse.next();
  }
}
