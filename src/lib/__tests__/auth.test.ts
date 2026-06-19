import { logout } from '../auth';
import { cookies } from 'next/headers';

// Mock next/headers
jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}));

describe('Auth - logout', () => {
  const originalEnv = process.env;
  let mockSet: jest.Mock;

  beforeEach(() => {
    // Reset mocks and env before each test
    jest.resetModules();
    process.env = { ...originalEnv };

    mockSet = jest.fn();
    (cookies as jest.Mock).mockResolvedValue({
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
