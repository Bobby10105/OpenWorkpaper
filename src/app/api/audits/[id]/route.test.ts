import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PUT, GET } from './route';
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
    $executeRaw: vi.fn(),
    $queryRaw: vi.fn(),
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
    vi.mocked(prisma.$executeRaw).mockResolvedValue(1 as never);
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ id: '123', title: 'Raw Fallback' }] as never);

    // Provide a mocked Request with .json() returning the exact expected object
    // This bypassed any Request body parsing issues in Vitest
    const req = new Request('http://localhost', { method: 'PUT', body: JSON.stringify({ pbcAttachmentUrl: null }) }) as NextRequest;

    // We don't spy on json since Request parse it

    const response = await PUT(req, mockParams);

    expect(response.status).toBe(200);
    expect(prisma.$executeRaw).toHaveBeenCalled();
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

describe('GET /api/audits/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 500 when database throws an error', async () => {
    // 1. Mock authentication session
    vi.mocked(getSession).mockResolvedValue({
      user: {
        id: 'user-1',
        role: 'Internal Auditor',
        username: 'testuser',
        mustChangePassword: false,
      },
    });

    // 2. Mock access permission
    vi.mocked(canAccessAudit).mockResolvedValue(true);

    // 3. Mock prisma.audit.findUnique to throw an error intentionally
    const errorMessage = 'Database connection failed';
    vi.mocked(prisma.audit.findUnique).mockRejectedValue(new Error(errorMessage));

    // Suppress console.error in this test as it's expected
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // 4. Call the handler
    const request = new Request('http://localhost:3000/api/audits/123');
    const response = await GET(request, { params: Promise.resolve({ id: '123' }) });

    // 5. Assert the response status and error message
    expect(response.status).toBe(500);

    // Parse the JSON response
    const data = await response.json();
    expect(data).toEqual({ error: 'Failed to fetch audit details' });

    // Verify console.error was called with the right format
    expect(consoleSpy).toHaveBeenCalledWith('[GET /api/audits/:id] Error:', expect.any(Error));

    // Restore console.error
    consoleSpy.mockRestore();
  });
});


describe('Audit Detail API Route', () => {
  const mockReq = {} as NextRequest;
  const mockProps = { params: Promise.resolve({ id: 'audit-123' }) };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/audits/[id]', () => {
    it('should return 401 if unauthorized', async () => {
      vi.mocked(getSession).mockResolvedValue(null);

      const response = await GET(mockReq, mockProps);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: 'Unauthorized' });
    });

    it('should return 403 if forbidden', async () => {
      vi.mocked(getSession).mockResolvedValue({ user: { id: 'user-1', role: 'Auditor', username: 'testuser', mustChangePassword: false } });
      vi.mocked(canAccessAudit).mockResolvedValue(false);

      const response = await GET(mockReq, mockProps);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data).toEqual({ error: 'Forbidden' });
    });

    it('should return 404 if audit not found', async () => {
      vi.mocked(getSession).mockResolvedValue({ user: { id: 'user-1', role: 'Auditor', username: 'testuser', mustChangePassword: false } });
      vi.mocked(canAccessAudit).mockResolvedValue(true);
      vi.mocked(prisma.audit.findUnique).mockResolvedValue(null);

      const response = await GET(mockReq, mockProps);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({ error: 'Audit not found' });
    });

    it('should return 200 and correctly mapped data for valid request', async () => {
      // Mock session and access
      vi.mocked(getSession).mockResolvedValue({ user: { id: 'user-1', role: 'Auditor', username: 'testuser', mustChangePassword: false } });
      vi.mocked(canAccessAudit).mockResolvedValue(true);

      // Mock audit findUnique
      const mockAudit = { id: 'audit-123', title: 'Test Audit' };
      vi.mocked(prisma.audit.findUnique).mockResolvedValue(mockAudit as never);

      // Setup $queryRaw mock
      const queryRawUnsafeMock = vi.mocked(prisma.$queryRaw);

      // We need to mock different responses based on the query being executed.
      // 1. Groups
      const mockGroups = [{ id: 'group-1', auditId: 'audit-123', title: 'Group 1' }];
      // 2. Procedures
      const mockProcedures = [
        { id: 'proc-1', auditId: 'audit-123', groupId: 'group-1', title: 'Proc 1' },
        { id: 'proc-2', auditId: 'audit-123', groupId: null, title: 'Ungrouped Proc' }
      ];
      // 3. Attachments (called for each procedure)
      const mockAttachmentsProc1 = [{ id: 'att-1', procedureId: 'proc-1', filename: 'file1.pdf' }];
      const mockAttachmentsProc2: never[] = [];
      // 4. Messages (called for each procedure)
      const mockMessagesProc1 = [{ id: 'msg-1', procedureId: 'proc-1', text: 'Hello' }];
      const mockMessagesProc2: never[] = [];

      queryRawUnsafeMock.mockImplementation(async (query: unknown) => {
        const q = Array.isArray(query) ? query.join('') : String(query);
        if (q.includes('FROM ProcedureGroup')) return mockGroups;
        if (q.includes('FROM ProcedureMessage')) return [...mockMessagesProc1, ...mockMessagesProc2];
        if (q.includes('FROM Attachment')) return [...mockAttachmentsProc1, ...mockAttachmentsProc2];
        if (q.includes('FROM Procedure')) return mockProcedures;
        return [];
      });

      const response = await GET(mockReq, mockProps);
      const data = await response.json();

      expect(response.status).toBe(200);

      // Verify mapping structure
      expect(data.id).toBe('audit-123');
      expect(data.title).toBe('Test Audit');

      // Check procedureGroups map
      expect(data.procedureGroups).toHaveLength(1);
      expect(data.procedureGroups[0].id).toBe('group-1');
      expect(data.procedureGroups[0].procedures).toHaveLength(1);
      expect(data.procedureGroups[0].procedures[0].id).toBe('proc-1');
      expect(data.procedureGroups[0].procedures[0].attachments).toEqual(mockAttachmentsProc1);
      expect(data.procedureGroups[0].procedures[0].messages).toEqual(mockMessagesProc1);

      // Check ungrouped procedures
      expect(data.procedures).toHaveLength(1);
      expect(data.procedures[0].id).toBe('proc-2');
      expect(data.procedures[0].attachments).toEqual([]);
      expect(data.procedures[0].messages).toEqual([]);
    });
  });
});
