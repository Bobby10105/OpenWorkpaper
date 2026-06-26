import { describe, it, expect, vi, beforeEach } from 'vitest';
import { proxy } from './proxy';
import { NextRequest } from 'next/server';
import { decrypt } from '@/lib/auth';

vi.mock('next/server', () => {
  return {
    NextResponse: {
      next: vi.fn().mockReturnValue({ type: 'next' }),
      redirect: vi.fn().mockImplementation((url) => ({ type: 'redirect', url: url.toString() })),
    },
    NextRequest: class MockNextRequest {
      url: string;
      nextUrl: { pathname: string, protocol: string };
      cookies: { get: (name: string) => { value: string } | undefined };
      constructor(url: string, init?: { cookies?: { session?: string } }) {
        const parsedUrl = new URL(url);
        this.url = url;
        this.nextUrl = {
          pathname: parsedUrl.pathname,
          protocol: parsedUrl.protocol,
        };
        this.cookies = {
          get: vi.fn().mockReturnValue(init?.cookies?.session ? { value: init.cookies.session } : undefined)
        };
      }
    }
  };
});

vi.mock('@/lib/auth', () => ({
  decrypt: vi.fn(),
}));

describe('proxy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Public paths', () => {
    it('should allow public paths without session', async () => {
      const req = new NextRequest('http://localhost/favicon.ico');
      const res = await proxy(req as unknown as NextRequest);
      expect(res).toEqual({ type: 'next' });
    });

    it('should allow /api/login without session', async () => {
      const req = new NextRequest('http://localhost/api/login');
      const res = await proxy(req as unknown as NextRequest);
      expect(res).toEqual({ type: 'next' });
    });
  });

  describe('Missing session', () => {
    it('should redirect to /login if session is missing on protected route', async () => {
      const req = new NextRequest('http://localhost/dashboard');
      const res = await proxy(req as unknown as NextRequest);
      expect(res).toEqual({ type: 'redirect', url: 'http://localhost/login' });
    });
  });

  describe('handleLoginAccess', () => {
    it('should redirect to / if pathname is /login and session is valid', async () => {
      vi.mocked(decrypt).mockResolvedValueOnce({ user: { id: '123' } } as never);
      const req = new NextRequest('http://localhost/login', { cookies: { session: 'valid-token' } } as unknown as RequestInit);
      const res = await proxy(req as unknown as NextRequest);
      expect(res).toEqual({ type: 'redirect', url: 'http://localhost/' });
      expect(decrypt).toHaveBeenCalledWith('valid-token');
    });

    it('should allow access to /login if session is invalid', async () => {
      vi.mocked(decrypt).mockRejectedValueOnce(new Error('Invalid token'));
      const req = new NextRequest('http://localhost/login', { cookies: { session: 'invalid-token' } } as unknown as RequestInit);
      const res = await proxy(req as unknown as NextRequest);
      expect(res).toEqual({ type: 'next' });
    });
  });

  describe('verifyAuth', () => {
    it('should allow access to protected route if session is valid', async () => {
      vi.mocked(decrypt).mockResolvedValueOnce({ user: { id: '123' } } as never);
      const req = new NextRequest('http://localhost/dashboard', { cookies: { session: 'valid-token' } } as unknown as RequestInit);
      const res = await proxy(req as unknown as NextRequest);
      expect(res).toEqual({ type: 'next' });
    });

    it('should redirect to /login if session decryption fails', async () => {
      vi.mocked(decrypt).mockRejectedValueOnce(new Error('expired'));
      const req = new NextRequest('http://localhost/dashboard', { cookies: { session: 'expired-token' } } as unknown as RequestInit);
      const res = await proxy(req as unknown as NextRequest);
      expect(res).toEqual({ type: 'redirect', url: 'http://localhost/login' });
    });

    describe('mustChangePassword', () => {
      it('should redirect to /settings/password if user must change password', async () => {
        vi.mocked(decrypt).mockResolvedValueOnce({ user: { id: '123', mustChangePassword: true } } as never);
        const req = new NextRequest('http://localhost/dashboard', { cookies: { session: 'valid-token' } } as unknown as RequestInit);
        const res = await proxy(req as unknown as NextRequest);
        expect(res).toEqual({ type: 'redirect', url: 'http://localhost/settings/password' });
      });

      it('should allow access to /settings/password if user must change password', async () => {
        vi.mocked(decrypt).mockResolvedValueOnce({ user: { id: '123', mustChangePassword: true } } as never);
        const req = new NextRequest('http://localhost/settings/password', { cookies: { session: 'valid-token' } } as unknown as RequestInit);
        const res = await proxy(req as unknown as NextRequest);
        expect(res).toEqual({ type: 'next' });
      });

      it('should allow access to /api/* routes even if user must change password', async () => {
        vi.mocked(decrypt).mockResolvedValueOnce({ user: { id: '123', mustChangePassword: true } } as never);
        const req = new NextRequest('http://localhost/api/users', { cookies: { session: 'valid-token' } } as unknown as RequestInit);
        const res = await proxy(req as unknown as NextRequest);
        expect(res).toEqual({ type: 'next' });
      });

      it('should allow access to /api/logout even if user must change password', async () => {
        vi.mocked(decrypt).mockResolvedValueOnce({ user: { id: '123', mustChangePassword: true } } as never);
        const req = new NextRequest('http://localhost/api/logout', { cookies: { session: 'valid-token' } } as unknown as RequestInit);
        const res = await proxy(req as unknown as NextRequest);
        expect(res).toEqual({ type: 'next' });
      });
    });
  });
});
