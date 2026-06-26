import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '@/lib/prisma';
import {
  hasGlobalAuditAccess,
  canAccessAudit,
  canAccessProcedure,
  canAccessAttachment,
  SessionUserLike
} from '@/lib/audit-access';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    teamMember: {
      findFirst: vi.fn(),
    },
    procedure: {
      findUnique: vi.fn(),
    },
    attachment: {
      findUnique: vi.fn(),
    },
  },
}));

describe('audit-access', () => {
  const globalUser: SessionUserLike = { id: 'user-1', role: 'Business Operations' };
  const normalUser: SessionUserLike = { id: 'user-2', role: 'User' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('hasGlobalAuditAccess', () => {
    it('returns true for Business Operations role', () => {
      expect(hasGlobalAuditAccess(globalUser)).toBe(true);
    });

    it('returns false for other roles', () => {
      expect(hasGlobalAuditAccess(normalUser)).toBe(false);
    });
  });

  describe('canAccessAudit', () => {
    it('returns true if user has global audit access', async () => {
      const result = await canAccessAudit(globalUser, 'audit-1');
      expect(result).toBe(true);
      expect(prisma.teamMember.findFirst).not.toHaveBeenCalled();
    });

    it('returns true if user is a team member for the audit', async () => {
      vi.mocked(prisma.teamMember.findFirst).mockResolvedValue({ id: 'member-1' } as never);
      const result = await canAccessAudit(normalUser, 'audit-1');
      expect(result).toBe(true);
      expect(prisma.teamMember.findFirst).toHaveBeenCalledWith({
        where: { auditId: 'audit-1', userId: 'user-2' },
        select: { id: true },
      });
    });

    it('returns false if user is not a team member', async () => {
      vi.mocked(prisma.teamMember.findFirst).mockResolvedValue(null as never);
      const result = await canAccessAudit(normalUser, 'audit-1');
      expect(result).toBe(false);
    });
  });

  describe('canAccessProcedure', () => {
    it('returns false if procedure is not found', async () => {
      vi.mocked(prisma.procedure.findUnique).mockResolvedValue(null as never);
      const result = await canAccessProcedure(normalUser, 'proc-1');
      expect(result).toBe(false);
    });

    it('returns true if user has global access, even if procedure exists', async () => {
      vi.mocked(prisma.procedure.findUnique).mockResolvedValue({ auditId: 'audit-1' } as never);
      const result = await canAccessProcedure(globalUser, 'proc-1');
      expect(result).toBe(true);
    });

    it('returns true if user can access the associated audit', async () => {
      vi.mocked(prisma.procedure.findUnique).mockResolvedValue({ auditId: 'audit-1' } as never);
      vi.mocked(prisma.teamMember.findFirst).mockResolvedValue({ id: 'member-1' } as never);
      const result = await canAccessProcedure(normalUser, 'proc-1');
      expect(result).toBe(true);
    });

    it('returns false if user cannot access the associated audit', async () => {
      vi.mocked(prisma.procedure.findUnique).mockResolvedValue({ auditId: 'audit-1' } as never);
      vi.mocked(prisma.teamMember.findFirst).mockResolvedValue(null as never);
      const result = await canAccessProcedure(normalUser, 'proc-1');
      expect(result).toBe(false);
    });
  });

  describe('canAccessAttachment', () => {
    it('returns false if attachment is not found', async () => {
      vi.mocked(prisma.attachment.findUnique).mockResolvedValue(null as never);
      const result = await canAccessAttachment(normalUser, 'attach-1');
      expect(result).toBe(false);
    });

    it('returns false if attachment has no procedure', async () => {
      vi.mocked(prisma.attachment.findUnique).mockResolvedValue({} as never);
      const result = await canAccessAttachment(normalUser, 'attach-1');
      expect(result).toBe(false);
    });

    it('returns false if procedure has no auditId', async () => {
      vi.mocked(prisma.attachment.findUnique).mockResolvedValue({ procedure: {} } as never);
      const result = await canAccessAttachment(normalUser, 'attach-1');
      expect(result).toBe(false);
    });

    it('returns true if user has global access, even if attachment exists', async () => {
      vi.mocked(prisma.attachment.findUnique).mockResolvedValue({ procedure: { auditId: 'audit-1' } } as never);
      const result = await canAccessAttachment(globalUser, 'attach-1');
      expect(result).toBe(true);
    });

    it('returns true if user can access the associated audit via attachment -> procedure', async () => {
      vi.mocked(prisma.attachment.findUnique).mockResolvedValue({ procedure: { auditId: 'audit-1' } } as never);
      vi.mocked(prisma.teamMember.findFirst).mockResolvedValue({ id: 'member-1' } as never);
      const result = await canAccessAttachment(normalUser, 'attach-1');
      expect(result).toBe(true);
    });

    it('returns false if user cannot access the associated audit', async () => {
      vi.mocked(prisma.attachment.findUnique).mockResolvedValue({ procedure: { auditId: 'audit-1' } } as never);
      vi.mocked(prisma.teamMember.findFirst).mockResolvedValue(null as never);
      const result = await canAccessAttachment(normalUser, 'attach-1');
      expect(result).toBe(false);
    });
  });
});
