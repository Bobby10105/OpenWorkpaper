import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { login } from '@/lib/auth';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const state = searchParams.get('state');

  if (error) {
    return NextResponse.redirect(new URL(`/login?error=${error}`, req.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=no_code', req.url));
  }

  const clientId = process.env.SSO_CLIENT_ID;
  const clientSecret = process.env.SSO_CLIENT_SECRET;
  const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/auth/sso/callback`;
  const issuerUrl = process.env.SSO_ISSUER_URL;
  if (!clientId || !clientSecret || !issuerUrl) {
    return NextResponse.redirect(new URL('/login?error=sso_not_configured', req.url));
  }

  try {
    const cookieStore = await cookies();
    const expectedState = cookieStore.get('sso_state')?.value;
    const expectedNonce = cookieStore.get('sso_nonce')?.value;

    if (!state || !expectedState || state !== expectedState) {
      return NextResponse.redirect(new URL('/login?error=invalid_state', req.url));
    }
    if (!expectedNonce) {
      return NextResponse.redirect(new URL('/login?error=missing_nonce', req.url));
    }

    // 1. Exchange code for tokens
    const tokenEndpoint = `${issuerUrl}/token`;
    const tokenRes = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!tokenRes.ok) {
      const errorData = await tokenRes.text();
      console.error('SSO Token Error:', errorData);
      return NextResponse.redirect(new URL('/login?error=token_exchange_failed', req.url));
    }

    const { id_token } = await tokenRes.json();
    if (!id_token) {
      return NextResponse.redirect(new URL('/login?error=missing_id_token', req.url));
    }

    // 2. Verify ID token signature and claims against issuer JWKS.
    const discoveryRes = await fetch(`${issuerUrl}/.well-known/openid-configuration`);
    if (!discoveryRes.ok) {
      return NextResponse.redirect(new URL('/login?error=oidc_discovery_failed', req.url));
    }
    const discovery = await discoveryRes.json() as { jwks_uri?: string; issuer?: string };
    if (!discovery.jwks_uri || !discovery.issuer) {
      return NextResponse.redirect(new URL('/login?error=oidc_metadata_invalid', req.url));
    }
    const jwks = createRemoteJWKSet(new URL(discovery.jwks_uri));
    const { payload } = await jwtVerify(id_token, jwks, {
      issuer: discovery.issuer,
      audience: clientId,
    });
    const tokenPayload = payload as {
      sub: string;
      email: string;
      name?: string;
      preferred_username?: string;
      nonce?: string;
    };
    if (tokenPayload.nonce !== expectedNonce) {
      return NextResponse.redirect(new URL('/login?error=invalid_nonce', req.url));
    }

    if (!tokenPayload.sub) {
      return NextResponse.redirect(new URL('/login?error=invalid_token', req.url));
    }

    // 3. Find or create user
    let user = await prisma.user.findUnique({
      where: { ssoId: tokenPayload.sub },
    });

    if (user && user.mustChangePassword) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { mustChangePassword: false },
      });
    }

    if (!user) {
      // If user doesn't exist by SSO ID, check by email/username
      const username = tokenPayload.preferred_username || tokenPayload.email || tokenPayload.sub;
      
      user = await prisma.user.findUnique({
        where: { username },
      });

      if (user) {
        // Link existing user to SSO and clear mustChangePassword
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            ssoId: tokenPayload.sub,
            ssoProvider: 'Agency SSO',
            mustChangePassword: false, // SSO users don't manage passwords here
          },
        });
      } else {
        // Create new user (default to 'User' role)
        user = await prisma.user.create({
          data: {
            username,
            role: 'User',
            ssoId: tokenPayload.sub,
            ssoProvider: 'Agency SSO',
            mustChangePassword: false, // SSO users don't manage passwords here
          },
        });
      }
    }

    // 4. Create session and redirect
    await login({
      id: user.id,
      username: user.username,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    });

    // Log the SSO login
    await prisma.auditLog.create({
      data: {
        action: 'LOGIN',
        entityType: 'USER',
        entityId: user.id,
        details: 'User logged in via Agency SSO',
        performedBy: user.username,
      },
    });

    const redirect = NextResponse.redirect(new URL('/', req.url));
    redirect.cookies.delete('sso_state');
    redirect.cookies.delete('sso_nonce');
    return redirect;
  } catch (error) {
    console.error('SSO Callback Error:', error);
    return NextResponse.redirect(new URL('/login?error=internal_error', req.url));
  }
}
