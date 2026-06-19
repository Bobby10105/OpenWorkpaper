import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { getSession } from '@/lib/auth';
import { canAccessAudit } from '@/lib/audit-access';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

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

describe('GET /api/audits/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 500 when database throws an error', async () => {
    // 1. Mock authentication session
    (getSession as any).mockResolvedValue({
      user: {
        id: 'user-1',
        role: 'Internal Auditor',
        username: 'testuser',
      },
    });

    // 2. Mock access permission
    (canAccessAudit as any).mockResolvedValue(true);

    // 3. Mock prisma.audit.findUnique to throw an error intentionally
    const errorMessage = 'Database connection failed';
    (prisma.audit.findUnique as any).mockRejectedValue(new Error(errorMessage));

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
