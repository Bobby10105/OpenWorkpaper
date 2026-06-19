import { jest } from '@jest/globals';

// We need to set up the mock before importing getSession.
// In ESM, mock needs to be hoisted, but with Jest and TS we can use jest.unmock/mock or standard mock at the top.
jest.unstable_mockModule('next/headers', () => ({
  cookies: jest.fn(),
}));

const { getSession, encrypt } = await import('../auth');
const { cookies } = await import('next/headers');
const jose = await import('jose');

// We'll also partially mock console to keep output clean, as `getSession` logs errors.
const originalConsoleError = console.error;
const originalConsoleDebug = console.debug;

describe('getSession', () => {
  const mockCookies = cookies as jest.Mock;

  const mockUser = {
    id: 'test-user-id',
    username: 'testuser',
    role: 'Auditor',
    mustChangePassword: false,
  };

  beforeAll(() => {
    console.error = jest.fn();
    console.debug = jest.fn();
  });

  afterAll(() => {
    console.error = originalConsoleError;
    console.debug = originalConsoleDebug;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return null when no session cookie is present', async () => {
    mockCookies.mockResolvedValue({
      get: jest.fn().mockReturnValue(undefined),
    });

    const session = await getSession();
    expect(session).toBeNull();
  });

  it('should return null when the session signature is invalid', async () => {
    mockCookies.mockResolvedValue({
      get: jest.fn().mockReturnValue({ value: 'invalid.jwt.token' }),
    });

    const session = await getSession();
    expect(session).toBeNull();
  });

  it('should return null and log debug when the session signature verification fails (tampered)', async () => {
    const differentSecret = new TextEncoder().encode('different-secret');
    const tamperedSession = await new jose.SignJWT({ user: mockUser })
      .setProtectedHeader({ alg: 'HS256' })
      .sign(differentSecret);

    mockCookies.mockResolvedValue({
      get: jest.fn().mockReturnValue({ value: tamperedSession }),
    });

    const session = await getSession();
    expect(session).toBeNull();
    expect(console.debug).toHaveBeenCalledWith(expect.stringContaining('Invalid session signature'));
  });

  it('should return null when the session is expired', async () => {
    const secretKey = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-for-dev-only');
    const expiredSession = await new jose.SignJWT({ user: mockUser })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('-1h')
      .sign(secretKey);

    mockCookies.mockResolvedValue({
      get: jest.fn().mockReturnValue({ value: expiredSession }),
    });

    const session = await getSession();
    expect(session).toBeNull();
    expect(console.debug).toHaveBeenCalledWith(expect.stringContaining('expired'));
  });

  it('should return the session user data when the session is valid', async () => {
    const validSession = await encrypt({ user: mockUser });

    mockCookies.mockResolvedValue({
      get: jest.fn().mockReturnValue({ value: validSession }),
    });

    const session = await getSession();

    expect(session).not.toBeNull();
    expect(session?.user).toEqual(mockUser);
  });
});
