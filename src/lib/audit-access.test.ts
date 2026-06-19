import { describe, it, expect, vi, beforeEach } from 'vitest';
import { canAccessProcedure, SessionUserLike } from './audit-access';
import { prisma } from '@/lib/prisma';

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    procedure: {
      findUnique: vi.fn(),
    },
    teamMember: {
      findFirst: vi.fn(),
    },
    attachment: {
      findUnique: vi.fn(),
    },
  },
}));

describe('canAccessProcedure', () => {
  const mockUser: SessionUserLike = {
    id: 'user-1',
    role: 'Auditor',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return false if procedure does not exist', async () => {
    // Edge case: Procedure returns null
    vi.mocked(prisma.procedure.findUnique).mockResolvedValue(null);

    const result = await canAccessProcedure(mockUser, 'missing-procedure');

    expect(prisma.procedure.findUnique).toHaveBeenCalledWith({
      where: { id: 'missing-procedure' },
      select: { auditId: true },
    });
    expect(result).toBe(false);
  });

  it('should return true if procedure exists and user has global audit access', async () => {
    // Global access role
    const globalUser: SessionUserLike = { ...mockUser, role: 'Business Operations' };

    vi.mocked(prisma.procedure.findUnique).mockResolvedValue({
      auditId: 'audit-1',
    } as any);

    const result = await canAccessProcedure(globalUser, 'proc-1');

    expect(result).toBe(true);
    expect(prisma.teamMember.findFirst).not.toHaveBeenCalled();
  });

  it('should return true if procedure exists and user is a team member for the audit', async () => {
    vi.mocked(prisma.procedure.findUnique).mockResolvedValue({
      auditId: 'audit-1',
    } as any);

    vi.mocked(prisma.teamMember.findFirst).mockResolvedValue({
      id: 'membership-1',
    } as any);

    const result = await canAccessProcedure(mockUser, 'proc-1');

    expect(prisma.teamMember.findFirst).toHaveBeenCalledWith({
      where: {
        auditId: 'audit-1',
        userId: mockUser.id,
      },
      select: { id: true },
    });
    expect(result).toBe(true);
  });

  it('should return false if procedure exists but user is not a team member', async () => {
    vi.mocked(prisma.procedure.findUnique).mockResolvedValue({
      auditId: 'audit-1',
    } as any);

    vi.mocked(prisma.teamMember.findFirst).mockResolvedValue(null);

    const result = await canAccessProcedure(mockUser, 'proc-1');

    expect(result).toBe(false);
  });
});
