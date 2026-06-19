import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { updateSession } from '../auth';
import { jwtVerify } from 'jose';

vi.mock('jose', () => {
  class MockSignJWT {
    setProtectedHeader = vi.fn().mockReturnThis();
    setIssuedAt = vi.fn().mockReturnThis();
    setExpirationTime = vi.fn().mockReturnThis();
    sign = vi.fn().mockResolvedValue('new-encrypted-session');
  }

  return {
    jwtVerify: vi.fn(),
    SignJWT: MockSignJWT,
  };
});

describe('updateSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not update if there is no session cookie', async () => {
    const mockRequest = {
      cookies: {
        get: vi.fn().mockReturnValue(undefined),
      },
    } as unknown as NextRequest;

    const res = await updateSession(mockRequest);

    expect(mockRequest.cookies.get).toHaveBeenCalledWith('session');
    expect(res).toBeUndefined();
    expect(jwtVerify).not.toHaveBeenCalled();
  });

  it('should return base response if decrypt throws', async () => {
    const mockSessionValue = 'mock-session-value';
    const mockRequest = {
      cookies: {
        get: vi.fn().mockReturnValue({ value: mockSessionValue }),
      },
    } as unknown as NextRequest;

    // Suppress console.error output for the caught exception

    vi.mocked(jwtVerify).mockRejectedValue(new Error('Invalid token'));

    const res = await updateSession(mockRequest);

    expect(jwtVerify).toHaveBeenCalled();
    expect(res).toBeDefined();
    // Verify it returned a NextResponse and did not set cookie
    expect(res?.headers.get('set-cookie')).toBeNull();

    // Restore original console.error
  });

  it('should update the session expiration time', async () => {
    const mockSessionValue = 'mock-session-value';
    const mockRequest = {
      cookies: {
        get: vi.fn().mockReturnValue({ value: mockSessionValue }),
      },
      nextUrl: {
        protocol: 'https:',
      },
    } as unknown as NextRequest;

    const parsedPayload = { user: { id: '1' }, expires: 1000 };
    vi.mocked(jwtVerify).mockResolvedValue({ payload: parsedPayload } as unknown as { payload: import("jose").JWTPayload });

    const res = await updateSession(mockRequest);
    expect(jwtVerify).toHaveBeenCalled();

    // Verify cookies set
    const setCookieHeader = res?.headers.get('set-cookie');
    expect(setCookieHeader).not.toBeNull();
    expect(setCookieHeader).toContain('session=new-encrypted-session');
    expect(setCookieHeader).toContain('Path=/');
    expect(setCookieHeader).toContain('HttpOnly');
    expect(setCookieHeader?.toLowerCase()).toContain('samesite=lax');
  });
});
