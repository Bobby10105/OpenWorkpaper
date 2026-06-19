import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PUT } from './route';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { canAccessAudit } from '@/lib/audit-access';
import fs from 'fs/promises';
import { NextRequest } from 'next/server';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    audit: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    $executeRawUnsafe: vi.fn(),
    $queryRawUnsafe: vi.fn(),
  }
}));

vi.mock('@/lib/auth', () => ({
  getSession: vi.fn(),
}));

vi.mock('@/lib/audit-access', () => ({
  canAccessAudit: vi.fn(),
}));

vi.mock('fs/promises', () => ({
  default: {
    unlink: vi.fn(),
  }
}));

describe('PUT /api/audits/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockParams = { params: Promise.resolve({ id: '123' }) };

  it('should return 401 if unauthorized', async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const req = new Request('http://localhost', { method: 'PUT', body: JSON.stringify({}) }) as NextRequest;
    const response = await PUT(req, mockParams);
    expect(response.status).toBe(401);
  });

  it('should return 403 if forbidden', async () => {
    vi.mocked(getSession).mockResolvedValue({ user: { id: 'u1', username: 'test', role: 'Auditor', mustChangePassword: false } } as never);
    vi.mocked(canAccessAudit).mockResolvedValue(false);
    const req = new Request('http://localhost', { method: 'PUT', body: JSON.stringify({}) }) as NextRequest;
    const response = await PUT(req, mockParams);
    expect(response.status).toBe(403);
  });

  it('should successfully update audit details', async () => {
    vi.mocked(getSession).mockResolvedValue({ user: { id: 'u1', username: 'test', role: 'Auditor', mustChangePassword: false } } as never);
    vi.mocked(canAccessAudit).mockResolvedValue(true);

    const updatedAudit = { id: '123', title: 'New Title', status: 'IN_PROGRESS' };
    vi.mocked(prisma.audit.update).mockResolvedValue(updatedAudit as never);
    vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);

    const req = new Request('http://localhost', { method: 'PUT', body: JSON.stringify({ title: 'New Title', status: 'IN_PROGRESS', fieldworkStartDate: '2023-01-01' }) }) as NextRequest;
    const response = await PUT(req, mockParams);

    expect(response.status).toBe(200);
    expect(prisma.audit.update).toHaveBeenCalledWith({
      where: { id: '123' },
      data: {
        title: 'New Title',
        status: 'IN_PROGRESS',
        fieldworkStartDate: new Date('2023-01-01'),
      }
    });
  });

  it('should delete milestone attachment if set to null', async () => {
    vi.mocked(getSession).mockResolvedValue({ user: { id: 'u1', username: 'test', role: 'Auditor', mustChangePassword: false } } as never);
    vi.mocked(canAccessAudit).mockResolvedValue(true);
    vi.mocked(prisma.audit.findUnique).mockResolvedValue({ id: '123', milestoneAttachmentUrl: 'path/to/file.pdf' } as never);
    vi.mocked(prisma.audit.update).mockResolvedValue({ id: '123' } as never);

    const req = new Request('http://localhost', { method: 'PUT', body: JSON.stringify({ milestoneAttachmentUrl: null }) }) as NextRequest;
    const response = await PUT(req, mockParams);

    expect(response.status).toBe(200);
    expect(fs.unlink).toHaveBeenCalledWith(expect.stringContaining('file.pdf'));
    expect(prisma.audit.update).toHaveBeenCalledWith({
      where: { id: '123' },
      data: expect.objectContaining({
        milestoneAttachmentUrl: null,
        milestoneAttachmentName: null,
      })
    });
  });

  it('should delete pbc attachment if set to null', async () => {
    vi.mocked(getSession).mockResolvedValue({ user: { id: 'u1', username: 'test', role: 'Auditor', mustChangePassword: false } } as never);
    vi.mocked(canAccessAudit).mockResolvedValue(true);
    vi.mocked(prisma.audit.findUnique).mockResolvedValue({ id: '123', pbcAttachmentUrl: 'path/to/pbc.pdf' } as never);
    vi.mocked(prisma.audit.update).mockResolvedValue({ id: '123' } as never);

    const req = new Request('http://localhost', { method: 'PUT', body: JSON.stringify({ pbcAttachmentUrl: null }) }) as NextRequest;
    const response = await PUT(req, mockParams);

    expect(response.status).toBe(200);
    expect(fs.unlink).toHaveBeenCalledWith(expect.stringContaining('pbc.pdf'));
    expect(prisma.audit.update).toHaveBeenCalledWith({
      where: { id: '123' },
      data: expect.objectContaining({
        pbcAttachmentUrl: null,
        pbcAttachmentName: null,
      })
    });
  });

  it('should fallback to raw sql if prisma update fails', async () => {
    vi.mocked(getSession).mockResolvedValue({ user: { id: 'u1', username: 'test', role: 'Auditor', mustChangePassword: false } } as never);
    vi.mocked(canAccessAudit).mockResolvedValue(true);

    vi.mocked(prisma.audit.update).mockRejectedValue(new Error('Schema syncing error'));
    vi.mocked(prisma.$executeRawUnsafe).mockResolvedValue(1 as never);
    vi.mocked(prisma.$queryRawUnsafe).mockResolvedValue([{ id: '123', title: 'Raw Fallback' }] as never);

    // Provide a mocked Request with .json() returning the exact expected object
    // This bypassed any Request body parsing issues in Vitest
    const req = new Request('http://localhost', { method: 'PUT', body: JSON.stringify({ pbcAttachmentUrl: null }) }) as NextRequest;

    // We don't spy on json since Request parse it

    const response = await PUT(req, mockParams);

    expect(response.status).toBe(200);
    expect(prisma.$executeRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE Audit SET pbcAttachmentUrl = ?, pbcAttachmentName = ? WHERE id = ?'),
      null,
      null,
      '123'
    );
  });

  it('should return 500 on unexpected error', async () => {
    vi.mocked(getSession).mockResolvedValue({ user: { id: 'u1', username: 'test', role: 'Auditor', mustChangePassword: false } } as never);
    vi.mocked(canAccessAudit).mockResolvedValue(true);

    const req = {
      json: vi.fn().mockRejectedValue(new Error('Invalid JSON'))
    } as unknown as NextRequest;

    const response = await PUT(req, mockParams);
    expect(response.status).toBe(500);
  });
});
