import { describe, it, expect, vi, beforeEach } from 'vitest';
import { canAccessAudit, hasGlobalAuditAccess, canAccessProcedure, canAccessAttachment, SessionUserLike } from './audit-access';
import { prisma } from '@/lib/prisma';

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
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('hasGlobalAuditAccess', () => {
    it('returns true if role is Business Operations', () => {
      expect(hasGlobalAuditAccess({ id: '1', role: 'Business Operations' })).toBe(true);
    });

    it('returns false for other roles', () => {
      expect(hasGlobalAuditAccess({ id: '1', role: 'User' })).toBe(false);
    });
  });

  describe('canAccessAudit', () => {
    it('returns true if user has global audit access', async () => {
      const result = await canAccessAudit({ id: '1', role: 'Business Operations' }, 'audit-1');
      expect(result).toBe(true);
      expect(prisma.teamMember.findFirst).not.toHaveBeenCalled();
    });

    it('returns true if user is a team member for the audit', async () => {
      vi.mocked(prisma.teamMember.findFirst).mockResolvedValue({ id: 'member-1' } as any);
      const result = await canAccessAudit({ id: '1', role: 'User' }, 'audit-1');
      expect(result).toBe(true);
      expect(prisma.teamMember.findFirst).toHaveBeenCalledWith({
        where: { auditId: 'audit-1', userId: '1' },
        select: { id: true },
      });
    });

    it('returns false if user is not a team member', async () => {
      vi.mocked(prisma.teamMember.findFirst).mockResolvedValue(null);
      const result = await canAccessAudit({ id: '1', role: 'User' }, 'audit-1');
      expect(result).toBe(false);
      expect(prisma.teamMember.findFirst).toHaveBeenCalledWith({
        where: { auditId: 'audit-1', userId: '1' },
        select: { id: true },
      });
    });
  });

  describe('canAccessProcedure', () => {
    it('returns false if procedure does not exist', async () => {
      vi.mocked(prisma.procedure.findUnique).mockResolvedValue(null);
      const result = await canAccessProcedure({ id: '1', role: 'User' }, 'proc-1');
      expect(result).toBe(false);
    });

    it('delegates to canAccessAudit if procedure exists', async () => {
      vi.mocked(prisma.procedure.findUnique).mockResolvedValue({ auditId: 'audit-1' } as any);
      vi.mocked(prisma.teamMember.findFirst).mockResolvedValue({ id: 'member-1' } as any);
      const result = await canAccessProcedure({ id: '1', role: 'User' }, 'proc-1');
      expect(result).toBe(true);
      expect(prisma.teamMember.findFirst).toHaveBeenCalledWith({
        where: { auditId: 'audit-1', userId: '1' },
        select: { id: true },
      });
    });
  });

  describe('canAccessAttachment', () => {
    it('returns false if attachment does not exist', async () => {
      vi.mocked(prisma.attachment.findUnique).mockResolvedValue(null);
      const result = await canAccessAttachment({ id: '1', role: 'User' }, 'att-1');
      expect(result).toBe(false);
    });

    it('returns false if attachment has no procedure or auditId', async () => {
      vi.mocked(prisma.attachment.findUnique).mockResolvedValue({ procedure: null } as any);
      const result = await canAccessAttachment({ id: '1', role: 'User' }, 'att-1');
      expect(result).toBe(false);
    });

    it('delegates to canAccessAudit if attachment exists with auditId', async () => {
      vi.mocked(prisma.attachment.findUnique).mockResolvedValue({ procedure: { auditId: 'audit-1' } } as any);
      vi.mocked(prisma.teamMember.findFirst).mockResolvedValue({ id: 'member-1' } as any);
      const result = await canAccessAttachment({ id: '1', role: 'User' }, 'att-1');
      expect(result).toBe(true);
      expect(prisma.teamMember.findFirst).toHaveBeenCalledWith({
        where: { auditId: 'audit-1', userId: '1' },
        select: { id: true },
      });
    });
  });
});
