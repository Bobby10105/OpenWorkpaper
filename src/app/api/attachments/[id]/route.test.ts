import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { canAccessAttachment } from '@/lib/audit-access';
import fs from 'fs/promises';
vi.mock('@/lib/prisma', () => ({
  prisma: {
    attachment: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth', () => ({
  getSession: vi.fn(),
}));

vi.mock('@/lib/audit-access', () => ({
  canAccessAttachment: vi.fn(),
}));

vi.mock('fs/promises', () => ({
  default: {
    readFile: vi.fn(),
  },
}));

vi.mock('next/server', () => {
  return {
    NextResponse: class extends Response {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      static json(body: any, init?: ResponseInit) {
        return new Response(JSON.stringify(body), {
          ...init,
          headers: {
            'Content-Type': 'application/json',
            ...(init?.headers || {}),
          },
        });
      }
    },
  };
});

describe('GET /api/attachments/[id]', () => {
  const req = new Request('http://localhost:3000/api/attachments/1');
  const params = Promise.resolve({ id: '1' });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 if user is not authenticated', async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    const res = await GET(req, { params });

    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 403 if user does not have access to attachment', async () => {
    vi.mocked(getSession).mockResolvedValue({ user: { id: 'user1', username: 'test', role: 'auditor', mustChangePassword: false } });
    vi.mocked(canAccessAttachment).mockResolvedValue(false);

    const res = await GET(req, { params });

    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe('Forbidden');
  });

  it('returns 404 if attachment is not found in database', async () => {
    vi.mocked(getSession).mockResolvedValue({ user: { id: 'user1', username: 'test', role: 'auditor', mustChangePassword: false } });
    vi.mocked(canAccessAttachment).mockResolvedValue(true);
    vi.mocked(prisma.attachment.findUnique).mockResolvedValue(null);

    const res = await GET(req, { params });

    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe('Attachment not found');
  });

  it('returns 404 if attachment has no filepath', async () => {
    vi.mocked(getSession).mockResolvedValue({ user: { id: 'user1', username: 'test', role: 'auditor', mustChangePassword: false } });
    vi.mocked(canAccessAttachment).mockResolvedValue(true);
    vi.mocked(prisma.attachment.findUnique).mockResolvedValue({
      id: '1',
      procedureId: 'p1',
      filename: 'test.pdf',
      filepath: null,
      mimetype: 'application/pdf',
      size: 1000,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'DRAFT',
      category: 'EVIDENCE',
      preparedBy: null,
      preparedDate: null,
      reviewedBy: null,
      reviewedDate: null,
    });

    const res = await GET(req, { params });

    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe('Attachment not found');
  });

  it('returns file buffer with correct headers on success', async () => {
    vi.mocked(getSession).mockResolvedValue({ user: { id: 'user1', username: 'test', role: 'auditor', mustChangePassword: false } });
    vi.mocked(canAccessAttachment).mockResolvedValue(true);
    vi.mocked(prisma.attachment.findUnique).mockResolvedValue({
      id: '1',
      procedureId: 'p1',
      filename: 'test.pdf',
      filepath: '/uploads/test.pdf',
      mimetype: 'application/pdf',
      size: 1000,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'DRAFT',
      category: 'EVIDENCE',
      preparedBy: null,
      preparedDate: null,
      reviewedBy: null,
      reviewedDate: null,
    });

    const mockBuffer = Buffer.from('mock file content');
    vi.mocked(fs.readFile).mockResolvedValue(mockBuffer);

    const res = await GET(req, { params });

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/pdf');
    expect(res.headers.get('Content-Disposition')).toBe('inline; filename="test.pdf"');

    const arrayBuffer = await res.arrayBuffer();
    expect(Buffer.from(arrayBuffer).toString()).toBe('mock file content');
  });

  it('handles errors gracefully and returns 404', async () => {
    vi.mocked(getSession).mockResolvedValue({ user: { id: 'user1', username: 'test', role: 'auditor', mustChangePassword: false } });
    vi.mocked(canAccessAttachment).mockResolvedValue(true);

    // Simulate fs.readFile throwing an error
    vi.mocked(prisma.attachment.findUnique).mockResolvedValue({
      id: '1',
      procedureId: 'p1',
      filename: 'test.pdf',
      filepath: '/uploads/test.pdf',
      mimetype: 'application/pdf',
      size: 1000,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'DRAFT',
      category: 'EVIDENCE',
      preparedBy: null,
      preparedDate: null,
      reviewedBy: null,
      reviewedDate: null,
    });
    vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found on disk'));

    const res = await GET(req, { params });

    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe('Failed to fetch file');
  });
});
