import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { login } from '@/lib/auth';
import { decodeJwt } from 'jose';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

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

  try {
    // 1. Exchange code for tokens
    const tokenEndpoint = `${issuerUrl}/token`;
    const tokenRes = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId!,
        client_secret: clientSecret!,
      }),
    });

    if (!tokenRes.ok) {
      const errorData = await tokenRes.text();
      console.error('SSO Token Error:', errorData);
      return NextResponse.redirect(new URL('/login?error=token_exchange_failed', req.url));
    }

    const { id_token } = await tokenRes.json();

    // 2. Decode and verify ID Token
    // In production, use jose.jwtVerify with the IDP's JWKS
    const payload = decodeJwt(id_token) as {
      sub: string;
      email: string;
      name?: string;
      preferred_username?: string;
    };

    if (!payload.sub) {
      return NextResponse.redirect(new URL('/login?error=invalid_token', req.url));
    }

    // 3. Find or create user
    let user = await prisma.user.findUnique({
      where: { ssoId: payload.sub },
    });

    if (!user) {
      // If user doesn't exist by SSO ID, check by email/username
      const username = payload.preferred_username || payload.email || payload.sub;
      
      user = await prisma.user.findUnique({
        where: { username },
      });

      if (user) {
        // Link existing user to SSO and clear mustChangePassword
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            ssoId: payload.sub,
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
            ssoId: payload.sub,
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

    return NextResponse.redirect(new URL('/', req.url));
  } catch (error) {
    console.error('SSO Callback Error:', error);
    return NextResponse.redirect(new URL('/login?error=internal_error', req.url));
  }
}
