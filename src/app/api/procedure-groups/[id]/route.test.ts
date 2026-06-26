import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PUT } from './route';
import { getSession } from '@/lib/auth';
import { canAccessAudit } from '@/lib/audit-access';
import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    procedureGroup: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  }
}));

vi.mock('@/lib/auth', () => ({
  getSession: vi.fn(),
}));

vi.mock('@/lib/audit-access', () => ({
  canAccessAudit: vi.fn(),
}));

describe('PUT /api/procedure-groups/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockParams = { params: Promise.resolve({ id: 'group-1' }) };

  it('should return 401 if unauthorized', async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    const req = new Request('http://localhost', {
      method: 'PUT',
      body: JSON.stringify({})
    }) as NextRequest;

    const response = await PUT(req, mockParams);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({ error: 'Unauthorized' });
  });

  it('should return 404 if procedure group not found', async () => {
    vi.mocked(getSession).mockResolvedValue({
      user: { id: 'u1', username: 'test', role: 'Auditor', mustChangePassword: false }
    } as never);

    vi.mocked(prisma.procedureGroup.findUnique).mockResolvedValue(null);

    const req = new Request('http://localhost', {
      method: 'PUT',
      body: JSON.stringify({})
    }) as NextRequest;

    const response = await PUT(req, mockParams);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data).toEqual({ error: 'Procedure group not found' });
  });

  it('should return 403 if forbidden', async () => {
    vi.mocked(getSession).mockResolvedValue({
      user: { id: 'u1', username: 'test', role: 'Auditor', mustChangePassword: false }
    } as never);

    vi.mocked(prisma.procedureGroup.findUnique).mockResolvedValue({
      id: 'group-1',
      auditId: 'audit-123'
    } as never);

    vi.mocked(canAccessAudit).mockResolvedValue(false);

    const req = new Request('http://localhost', {
      method: 'PUT',
      body: JSON.stringify({})
    }) as NextRequest;

    const response = await PUT(req, mockParams);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data).toEqual({ error: 'Forbidden' });
  });

  it('should return 200 and update the procedure group successfully', async () => {
    vi.mocked(getSession).mockResolvedValue({
      user: { id: 'u1', username: 'test', role: 'Auditor', mustChangePassword: false }
    } as never);

    vi.mocked(prisma.procedureGroup.findUnique).mockResolvedValue({
      id: 'group-1',
      auditId: 'audit-123'
    } as never);

    vi.mocked(canAccessAudit).mockResolvedValue(true);

    const updatedGroup = { id: 'group-1', auditId: 'audit-123', title: 'Updated Title', displayOrder: 1 };
    vi.mocked(prisma.procedureGroup.update).mockResolvedValue(updatedGroup as never);

    const req = new Request('http://localhost', {
      method: 'PUT',
      body: JSON.stringify({ title: 'Updated Title', displayOrder: 1 })
    }) as NextRequest;

    const response = await PUT(req, mockParams);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(updatedGroup);
    expect(prisma.procedureGroup.update).toHaveBeenCalledWith({
      where: { id: 'group-1' },
      data: {
        title: 'Updated Title',
        displayOrder: 1,
      }
    });
  });

  it('should return 500 when database throws an error on update', async () => {
    vi.mocked(getSession).mockResolvedValue({
      user: { id: 'u1', username: 'test', role: 'Auditor', mustChangePassword: false }
    } as never);

    vi.mocked(prisma.procedureGroup.findUnique).mockResolvedValue({
      id: 'group-1',
      auditId: 'audit-123'
    } as never);

    vi.mocked(canAccessAudit).mockResolvedValue(true);

    const errorMessage = 'Database update failed';
    vi.mocked(prisma.procedureGroup.update).mockRejectedValue(new Error(errorMessage));

    const req = new Request('http://localhost', {
      method: 'PUT',
      body: JSON.stringify({ title: 'New Title' })
    }) as NextRequest;

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const response = await PUT(req, mockParams);

    expect(response.status).toBe(500);

    const data = await response.json();
    expect(data).toEqual({ error: errorMessage });
    expect(consoleSpy).toHaveBeenCalledWith('Update group error:', expect.any(Error));

    consoleSpy.mockRestore();
  });
});
