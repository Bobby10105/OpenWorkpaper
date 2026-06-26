import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({
  getSession: vi.fn().mockResolvedValue({ user: { id: '1', username: 'testuser' } })
}));

vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((body, init) => ({ body, status: init?.status || 200 }))
  }
}));

// Need to mock the access checks
vi.mock('@/lib/audit-access', () => ({
  canAccessAudit: vi.fn().mockResolvedValue(true),
  canAccessProcedure: vi.fn().mockResolvedValue(true),
}));

function createFormData(filename: string) {
  const formData = new FormData();
  formData.append('procedureId', '123');
  const file = new File(['dummy content'], filename, { type: 'text/plain' });
  formData.append('file', file);
  return formData;
}

describe('POST /api/upload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows valid file extensions', async () => {
    const req = { formData: vi.fn().mockResolvedValue(createFormData('document.pdf')) } as unknown as NextRequest;
    const res = await POST(req);
    expect((res as never as { status: number }).status).not.toBe(400);
    expect((res as never as { body: { error?: string } }).body?.error).not.toBe('File type not allowed');
  });

  it('rejects invalid file extensions', async () => {
    const req = { formData: vi.fn().mockResolvedValue(createFormData('malicious.exe')) } as unknown as NextRequest;
    const res = await POST(req);
    expect((res as never as { status: number }).status).toBe(400);
    expect((res as never as { body: { error?: string } }).body?.error).toBe('File type not allowed');
  });
});
