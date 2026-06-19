import { login } from '../auth';
import { cookies } from 'next/headers';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

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
