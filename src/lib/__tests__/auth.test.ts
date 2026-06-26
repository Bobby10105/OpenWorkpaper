import { login, encrypt, decrypt, logout, getSession, updateSession } from '../auth';
import { cookies } from 'next/headers';
import { vi, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { SignJWT } from 'jose';
import { NextRequest } from "next/server";

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

describe('login', () => {
  let mockSet: ReturnType<typeof vi.fn>;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    mockSet = vi.fn();
    (cookies as ReturnType<typeof vi.fn>).mockResolvedValue({
      set: mockSet,
    });
    originalEnv = process.env;
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  const testUser = {
    id: 'user-id',
    username: 'testuser',
    role: 'user',
    mustChangePassword: false,
  };

  it('should set session cookie with correct name and properties', async () => {
    await login(testUser);

    expect(cookies).toHaveBeenCalled();
    expect(mockSet).toHaveBeenCalledWith(
      'session',
      expect.any(String),
      expect.objectContaining({
        httpOnly: true,
        path: '/',
        sameSite: 'lax',
      })
    );
  });

  it('should set secure to true when environment is production and base URL is https', async () => {
    process.env.NODE_ENV = 'production';
    process.env.NEXT_PUBLIC_BASE_URL = 'https://example.com';

    await login(testUser);

    expect(mockSet).toHaveBeenCalledWith(
      'session',
      expect.any(String),
      expect.objectContaining({
        secure: true,
      })
    );
  });

  it('should set secure to false in non-production environments', async () => {
    process.env.NODE_ENV = 'development';
    process.env.NEXT_PUBLIC_BASE_URL = 'https://example.com';

    await login(testUser);

    expect(mockSet).toHaveBeenCalledWith(
      'session',
      expect.any(String),
      expect.objectContaining({
        secure: false,
      })
    );
  });

  it('should set secure to false when base URL is not https, even in production', async () => {
    process.env.NODE_ENV = 'production';
    process.env.NEXT_PUBLIC_BASE_URL = 'http://example.com';

    await login(testUser);

    expect(mockSet).toHaveBeenCalledWith(
      'session',
      expect.any(String),
      expect.objectContaining({
        secure: false,
      })
    );
  });

  it('should set secure to false when base URL is missing, even in production', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.NEXT_PUBLIC_BASE_URL;

    await login(testUser);

    expect(mockSet).toHaveBeenCalledWith(
      'session',
      expect.any(String),
      expect.objectContaining({
        secure: false,
      })
    );
  });
});

describe('Auth - JWT encryption and decryption', () => {
  const originalEnv = process.env;

  beforeAll(() => {
    process.env = { ...originalEnv, JWT_SECRET: 'test-secret-key' };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should encrypt and decrypt a valid payload', async () => {
    const payload = { userId: '123', role: 'admin' };
    const token = await encrypt(payload);

    expect(token).toBeTypeOf('string');

    const decrypted = await decrypt(token);
    expect(decrypted.userId).toBe(payload.userId);
    expect(decrypted.role).toBe(payload.role);
    expect(decrypted).toHaveProperty('exp');
    expect(decrypted).toHaveProperty('iat');
  });

  it('should throw an error if the signature is tampered with', async () => {
    const payload = { userId: '456' };
    const token = await encrypt(payload);

    const parts = token.split('.');
    expect(parts.length).toBe(3);

    const sig = parts[2];
    const tamperedSig = sig.slice(0, -1) + (sig.endsWith('A') ? 'B' : 'A');
    const tamperedToken = `${parts[0]}.${parts[1]}.${tamperedSig}`;

    await expect(decrypt(tamperedToken)).rejects.toThrowError(
      'Invalid session signature. The secret key may have changed.'
    );
  });

  it('should throw an error if the JWT is expired', async () => {
    const secretKey = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-for-dev-only');
    const expiredToken = await new SignJWT({ userId: '789' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('-1s') // Expired in the past
      .sign(secretKey);

    await expect(decrypt(expiredToken)).rejects.toThrowError(
      'Session has expired.'
    );
  });
});

describe('Auth - logout', () => {
  const originalEnv = process.env;
  let mockSet: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };

    mockSet = vi.fn();
    (cookies as ReturnType<typeof vi.fn>).mockResolvedValue({
      set: mockSet,
    });
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should set an empty session cookie with expiration in the past', async () => {
    await logout();

    expect(cookies).toHaveBeenCalled();
    expect(mockSet).toHaveBeenCalledWith('session', '', expect.objectContaining({
      expires: new Date(0),
      path: '/',
    }));
  });

  it('should not set secure flag when not in production', async () => {
    process.env.NODE_ENV = 'development';
    process.env.NEXT_PUBLIC_BASE_URL = 'http://localhost:3000';

    await logout();

    expect(mockSet).toHaveBeenCalledWith('session', '', expect.objectContaining({
      secure: false,
    }));
  });

  it('should not set secure flag in production if URL is not https', async () => {
    process.env.NODE_ENV = 'production';
    process.env.NEXT_PUBLIC_BASE_URL = 'http://example.com';

    await logout();

    expect(mockSet).toHaveBeenCalledWith('session', '', expect.objectContaining({
      secure: false,
    }));
  });

  it('should set secure flag in production with https URL', async () => {
    process.env.NODE_ENV = 'production';
    process.env.NEXT_PUBLIC_BASE_URL = 'https://example.com';

    await logout();

    expect(mockSet).toHaveBeenCalledWith('session', '', expect.objectContaining({
      secure: true,
    }));
  });

  it('should handle undefined NEXT_PUBLIC_BASE_URL gracefully in production', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.NEXT_PUBLIC_BASE_URL;

    await logout();

    expect(mockSet).toHaveBeenCalledWith('session', '', expect.objectContaining({
      secure: false,
    }));
  });
});

describe('Auth - getSession', () => {
  const mockUser = {
    id: 'test-user-id',
    username: 'testuser',
    role: 'Auditor',
    mustChangePassword: false,
  };

  beforeAll(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return null when no session cookie is present', async () => {
    (cookies as ReturnType<typeof vi.fn>).mockResolvedValue({
      get: vi.fn().mockReturnValue(undefined),
    });

    const session = await getSession();
    expect(session).toBeNull();
  });

  it('should return null when the session signature is invalid', async () => {
    (cookies as ReturnType<typeof vi.fn>).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: 'invalid.jwt.token' }),
    });

    const session = await getSession();
    expect(session).toBeNull();
  });

  it('should return null and log debug when the session signature verification fails (tampered)', async () => {
    const differentSecret = new TextEncoder().encode('different-secret');
    const tamperedSession = await new SignJWT({ user: mockUser })
      .setProtectedHeader({ alg: 'HS256' })
      .sign(differentSecret);

    (cookies as ReturnType<typeof vi.fn>).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: tamperedSession }),
    });

    const session = await getSession();
    expect(session).toBeNull();
    expect(console.debug).toHaveBeenCalledWith(expect.stringContaining('Invalid session signature'));
  });

  it('should return null when the session is expired', async () => {
    const secretKey = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-for-dev-only');
    const expiredSession = await new SignJWT({ user: mockUser })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('-1h')
      .sign(secretKey);

    (cookies as ReturnType<typeof vi.fn>).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: expiredSession }),
    });

    const session = await getSession();
    expect(session).toBeNull();
    expect(console.debug).toHaveBeenCalledWith(expect.stringContaining('expired'));
  });

  it('should return the session user data when the session is valid', async () => {
    const validSession = await encrypt(mockUser); // encrypt accepts payload

    (cookies as ReturnType<typeof vi.fn>).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: validSession }),
    });

    const session = await getSession();

    expect(session).not.toBeNull();
    expect(session?.userId).toEqual(mockUser.userId); // getSession decrypts to payload
  });

  describe('Auth - updateSession', () => {
    it('should not update if there is no session cookie', async () => {
      const mockRequest = {
        cookies: {
          get: vi.fn().mockReturnValue(undefined),
        },
      } as unknown as NextRequest;
      const res = await updateSession(mockRequest);
      expect(mockRequest.cookies.get).toHaveBeenCalledWith('session');
      expect(res).toBeUndefined();
    });

    it('should return base response if decrypt throws', async () => {
      const mockRequest = {
        cookies: {
          get: vi.fn().mockReturnValue({ value: 'invalid-token' }),
        },
      } as unknown as NextRequest;
      const res = await updateSession(mockRequest);
      expect(res).toBeDefined();
      expect(res?.headers.get('set-cookie')).toBeNull();
    });

    it('should update the session expiration time', async () => {
      const validToken = await encrypt({ user: { id: 'test' } });
      const mockRequest = {
        cookies: {
          get: vi.fn().mockReturnValue({ value: validToken }),
        },
        nextUrl: {
          protocol: 'https:',
        },
      } as unknown as NextRequest;

      const res = await updateSession(mockRequest);
      expect(res).toBeDefined();
      const setCookieHeader = res?.headers.get('set-cookie');
      expect(setCookieHeader).not.toBeNull();
      expect(setCookieHeader).toContain('session=');
      expect(setCookieHeader).toContain('Path=/');
      expect(setCookieHeader).toContain('HttpOnly');
    });
  });

});
