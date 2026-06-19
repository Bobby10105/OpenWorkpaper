import { describe, it, expect, vi, beforeEach } from 'vitest';
import { canAccessAttachment, SessionUserLike, canAccessAudit, hasGlobalAuditAccess } from './audit-access';
import { prisma } from '@/lib/prisma';

// Mock the prisma client
vi.mock('@/lib/prisma', () => ({
  prisma: {
    attachment: {
      findUnique: vi.fn(),
    },
    teamMember: {
      findFirst: vi.fn(),
    },
  },
}));

describe('audit-access', () => {
  describe('canAccessAttachment', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should return false if attachment is not found', async () => {
      vi.mocked(prisma.attachment.findUnique).mockResolvedValue(null);
      const user: SessionUserLike = { id: 'user1', role: 'Staff' };
      const result = await canAccessAttachment(user, 'attachment1');
      expect(result).toBe(false);
      expect(prisma.attachment.findUnique).toHaveBeenCalledWith({
        where: { id: 'attachment1' },
        include: {
          procedure: {
            select: { auditId: true },
          },
        },
      });
    });

    it('should return false if attachment has no procedure', async () => {
      // @ts-ignore
      vi.mocked(prisma.attachment.findUnique).mockResolvedValue({
        id: 'attachment1',
        procedure: null,
      });
      const user: SessionUserLike = { id: 'user1', role: 'Staff' };
      const result = await canAccessAttachment(user, 'attachment1');
      expect(result).toBe(false);
    });

    it('should return false if procedure has no auditId', async () => {
      // @ts-ignore
      vi.mocked(prisma.attachment.findUnique).mockResolvedValue({
        id: 'attachment1',
        procedure: { auditId: null },
      });
      const user: SessionUserLike = { id: 'user1', role: 'Staff' };
      const result = await canAccessAttachment(user, 'attachment1');
      expect(result).toBe(false);
    });

    it('should return true if user has global audit access', async () => {
      // @ts-ignore
      vi.mocked(prisma.attachment.findUnique).mockResolvedValue({
        id: 'attachment1',
        procedure: { auditId: 'audit1' },
      });
      const user: SessionUserLike = { id: 'user1', role: 'Business Operations' };
      const result = await canAccessAttachment(user, 'attachment1');
      expect(result).toBe(true);
    });

    it('should return true if user is a team member for the audit', async () => {
      // @ts-ignore
      vi.mocked(prisma.attachment.findUnique).mockResolvedValue({
        id: 'attachment1',
        procedure: { auditId: 'audit1' },
      });
      // @ts-ignore
      vi.mocked(prisma.teamMember.findFirst).mockResolvedValue({ id: 'membership1' });
      const user: SessionUserLike = { id: 'user1', role: 'Staff' };
      const result = await canAccessAttachment(user, 'attachment1');
      expect(result).toBe(true);
      expect(prisma.teamMember.findFirst).toHaveBeenCalledWith({
        where: {
          auditId: 'audit1',
          userId: 'user1',
        },
        select: { id: true },
      });
    });

    it('should return false if user is not a team member and has no global access', async () => {
      // @ts-ignore
      vi.mocked(prisma.attachment.findUnique).mockResolvedValue({
        id: 'attachment1',
        procedure: { auditId: 'audit1' },
      });
      vi.mocked(prisma.teamMember.findFirst).mockResolvedValue(null);
      const user: SessionUserLike = { id: 'user1', role: 'Staff' };
      const result = await canAccessAttachment(user, 'attachment1');
      expect(result).toBe(false);
    });
  });
});
