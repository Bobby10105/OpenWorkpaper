import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { encrypt, decrypt } from '../auth';
import { SignJWT } from 'jose';

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

    // Tamper the token by changing the last character of the signature
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
