import { describe, it, expect, vi, beforeEach, MockInstance } from 'vitest';
import { proxy } from '@/proxy';
import { NextRequest } from 'next/server';
import { decrypt } from '@/lib/auth';

vi.mock('@/lib/auth', () => ({
  decrypt: vi.fn(),
}));

vi.mock('next/server', () => {
  return {
    NextRequest: class MockNextRequest {
      url: string;
      nextUrl: { pathname: string };
      cookies: { get: () => { value?: string } };
      method: string;
      constructor(url: string) {
        this.url = url;
        const parsed = new URL(url);
        this.nextUrl = { pathname: parsed.pathname };
        this.cookies = { get: vi.fn() as unknown as () => { value?: string } };
        this.method = 'GET';
      }
    },
    NextResponse: {
      next: vi.fn().mockReturnValue({ type: 'next' }),
      redirect: vi.fn().mockImplementation((url) => ({ type: 'redirect', url: url.toString() })),
    },
  };
});

describe('proxy middleware', () => {
  let consoleErrorSpy: MockInstance;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  const createRequest = (url: string, sessionValue?: string, method = 'GET') => {
    const req = new NextRequest(url) as unknown as NextRequest & { method: string };
    req.method = method;
    if (sessionValue) {
      (req.cookies.get as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ value: sessionValue });
    }
    return req;
  };

  it('redirects to /login if no session and path is not public', async () => {
    const req = createRequest('http://localhost/dashboard');
    const res = await proxy(req);
    expect(res).toEqual({ type: 'redirect', url: 'http://localhost/login' });
  });

  it('allows access to public paths without session', async () => {
    const req = createRequest('http://localhost/favicon.ico');
    const res = await proxy(req);
    expect(res).toEqual({ type: 'next' });
  });

  it('redirects /login to / if valid session exists', async () => {
    const req = createRequest('http://localhost/login', 'valid-session');
    (decrypt as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: 1 } });
    const res = await proxy(req);
    expect(res).toEqual({ type: 'redirect', url: 'http://localhost/' });
  });

  it('allows access to /login if session is invalid', async () => {
    const req = createRequest('http://localhost/login', 'invalid-session');
    (decrypt as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('invalid signature'));
    const res = await proxy(req);
    expect(res).toEqual({ type: 'next' });
  });

  it('allows authenticated access to protected route', async () => {
    const req = createRequest('http://localhost/dashboard', 'valid-session');
    (decrypt as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: 1 } });
    const res = await proxy(req);
    expect(res).toEqual({ type: 'next' });
  });

  it('redirects to /login if session decryption fails on protected route (expired)', async () => {
    const req = createRequest('http://localhost/dashboard', 'invalid-session');
    (decrypt as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('signature expired'));
    const res = await proxy(req);
    expect(res).toEqual({ type: 'redirect', url: 'http://localhost/login' });
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('redirects to /login if session decryption fails on protected route (other error)', async () => {
    const req = createRequest('http://localhost/dashboard', 'invalid-session');
    (decrypt as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('some random decryption error'));
    const res = await proxy(req);
    expect(res).toEqual({ type: 'redirect', url: 'http://localhost/login' });
    expect(consoleErrorSpy).toHaveBeenCalledWith('[Proxy] Session decryption failed:', expect.any(Error));
  });

  it('redirects to /settings/password if user must change password', async () => {
    const req = createRequest('http://localhost/dashboard', 'valid-session');
    (decrypt as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { mustChangePassword: true } });
    const res = await proxy(req);
    expect(res).toEqual({ type: 'redirect', url: 'http://localhost/settings/password' });
  });

  it('allows access to /settings/password if user must change password', async () => {
    const req = createRequest('http://localhost/settings/password', 'valid-session');
    (decrypt as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { mustChangePassword: true } });
    const res = await proxy(req);
    expect(res).toEqual({ type: 'next' });
  });

  it('allows access to /api/ routes if user must change password', async () => {
    const req = createRequest('http://localhost/api/some-endpoint', 'valid-session');
    (decrypt as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { mustChangePassword: true } });
    const res = await proxy(req);
    expect(res).toEqual({ type: 'next' });
  });

  it('allows access to /api/logout if user must change password', async () => {
    const req = createRequest('http://localhost/api/logout', 'valid-session');
    (decrypt as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { mustChangePassword: true } });
    const res = await proxy(req);
    expect(res).toEqual({ type: 'next' });
  });

  it('allows access to public /api/login path without session', async () => {
    const req = createRequest('http://localhost/api/login');
    const res = await proxy(req);
    expect(res).toEqual({ type: 'next' });
  });

  it('allows access to public /api/auth/sso path without session', async () => {
    const req = createRequest('http://localhost/api/auth/sso/provider');
    const res = await proxy(req);
    expect(res).toEqual({ type: 'next' });
  });

  it('allows access to public /_next path without session', async () => {
    const req = createRequest('http://localhost/_next/static/css/app.css');
    const res = await proxy(req);
    expect(res).toEqual({ type: 'next' });
  });
});
