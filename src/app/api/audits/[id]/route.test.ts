import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/lib/auth', () => ({
  getSession: vi.fn(),
}));

vi.mock('@/lib/audit-access', () => ({
  canAccessAudit: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    audit: {
      findUnique: vi.fn(),
    },
    $queryRawUnsafe: vi.fn(),
  },
}));

import { getSession } from '@/lib/auth';
import { canAccessAudit } from '@/lib/audit-access';
import { prisma } from '@/lib/prisma';

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
      vi.mocked(getSession).mockResolvedValue({ user: { id: 'user-1', role: 'Auditor', username: 'testuser' } } as any);
      vi.mocked(canAccessAudit).mockResolvedValue(false);

      const response = await GET(mockReq, mockProps);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data).toEqual({ error: 'Forbidden' });
    });

    it('should return 404 if audit not found', async () => {
      vi.mocked(getSession).mockResolvedValue({ user: { id: 'user-1', role: 'Auditor', username: 'testuser' } } as any);
      vi.mocked(canAccessAudit).mockResolvedValue(true);
      vi.mocked(prisma.audit.findUnique).mockResolvedValue(null);

      const response = await GET(mockReq, mockProps);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({ error: 'Audit not found' });
    });

    it('should return 200 and correctly mapped data for valid request', async () => {
      // Mock session and access
      vi.mocked(getSession).mockResolvedValue({ user: { id: 'user-1', role: 'Auditor', username: 'testuser' } } as any);
      vi.mocked(canAccessAudit).mockResolvedValue(true);

      // Mock audit findUnique
      const mockAudit = { id: 'audit-123', title: 'Test Audit' };
      vi.mocked(prisma.audit.findUnique).mockResolvedValue(mockAudit as any);

      // Setup $queryRawUnsafe mock
      const queryRawUnsafeMock = vi.mocked(prisma.$queryRawUnsafe);

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
      const mockAttachmentsProc2 = [] as any[];
      // 4. Messages (called for each procedure)
      const mockMessagesProc1 = [{ id: 'msg-1', procedureId: 'proc-1', text: 'Hello' }];
      const mockMessagesProc2 = [] as any[];

      queryRawUnsafeMock.mockImplementation(async (query: unknown, ...args: any[]) => {
        const q = query as string;
        if (q.includes('FROM ProcedureGroup')) return mockGroups;
        if (q.includes('FROM ProcedureMessage')) {
             if (args[0] === 'proc-1') return mockMessagesProc1;
             if (args[0] === 'proc-2') return mockMessagesProc2;
        }
        if (q.includes('FROM Attachment')) {
            if (args[0] === 'proc-1') return mockAttachmentsProc1;
            if (args[0] === 'proc-2') return mockAttachmentsProc2;
        }
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
