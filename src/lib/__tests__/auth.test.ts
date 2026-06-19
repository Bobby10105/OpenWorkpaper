import { login, encrypt, decrypt } from '../auth';
import { cookies } from 'next/headers';
import { vi, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { SignJWT } from 'jose';

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
