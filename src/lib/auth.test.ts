import { describe, it, expect } from 'vitest';
import { encrypt } from './auth';

describe('Auth Module - encrypt', () => {
  it('should encrypt a payload and return a non-empty string', async () => {
    const payload = { userId: '123' };
    const token = await encrypt(payload);

    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
  });

  it('should produce a valid JWT format (header.payload.signature)', async () => {
    const payload = { userId: '456' };
    const token = await encrypt(payload);

    const parts = token.split('.');
    expect(parts.length).toBe(3);
  });
});
