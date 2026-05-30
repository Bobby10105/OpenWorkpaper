import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'node:crypto';

export async function GET() {
  const clientId = process.env.SSO_CLIENT_ID;
  const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/auth/sso/callback`;
  const issuerUrl = process.env.SSO_ISSUER_URL;

  if (!clientId || !issuerUrl) {
    console.error('SSO configuration missing');
    return NextResponse.json({ error: 'SSO not configured' }, { status: 500 });
  }

  // In a real app, you would fetch the authorization_endpoint from OIDC Discovery
  // For now, we assume a standard path or configured via env
  const authEndpoint = `${issuerUrl}/auth`;
  const state = crypto.randomUUID();
  const nonce = crypto.randomUUID();
  const cookieStore = await cookies();
  const isProduction = process.env.NODE_ENV === 'production';
  const isSecureEnv = redirectUri.startsWith('https://');
  const cookieOptions = {
    httpOnly: true as const,
    secure: isProduction && isSecureEnv,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 10, // 10 minutes
  };
  cookieStore.set('sso_state', state, cookieOptions);
  cookieStore.set('sso_nonce', nonce, cookieOptions);
  
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid profile email',
    state,
    nonce,
  });

  return NextResponse.redirect(`${authEndpoint}?${params.toString()}`);
}
