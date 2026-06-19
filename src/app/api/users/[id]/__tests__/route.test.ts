import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PATCH } from '../route';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      update: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth', () => ({
  getSession: vi.fn(),
}));

describe('PATCH /api/users/[id]', () => {
  const mockUserId = '123';
  const mockParams = Promise.resolve({ id: mockUserId });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 if user is not authenticated', async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    const req = new NextRequest('http://localhost/api/users/123', {
      method: 'PATCH',
      body: JSON.stringify({ role: 'Auditor' }),
    });

    const response = await PATCH(req, { params: mockParams });
    expect(response.status).toBe(401);

    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 403 if user is not an IT Administrator', async () => {
    vi.mocked(getSession).mockResolvedValue({
      user: { id: '456', role: 'Auditor', username: 'auditor' },
    } as { user: { id: string, role: string, username: string } });

    const req = new NextRequest('http://localhost/api/users/123', {
      method: 'PATCH',
      body: JSON.stringify({ role: 'Auditor' }),
    });

    const response = await PATCH(req, { params: mockParams });
    expect(response.status).toBe(403);

    const data = await response.json();
    expect(data.error).toBe('Forbidden');
  });

  it('should successfully update user role if user is an IT Administrator', async () => {
    vi.mocked(getSession).mockResolvedValue({
      user: { id: 'admin123', role: 'IT Administrator', username: 'admin' },
    } as { user: { id: string, role: string, username: string } });

    const updatedUser = {
      id: mockUserId,
      username: 'testuser',
      role: 'Auditor',
      mustChangePassword: false,
      createdAt: new Date().toISOString(),
    };
    vi.mocked(prisma.user.update).mockResolvedValue(updatedUser);

    const req = new NextRequest('http://localhost/api/users/123', {
      method: 'PATCH',
      body: JSON.stringify({ role: 'Auditor' }),
    });

    const response = await PATCH(req, { params: mockParams });
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.id).toBe(updatedUser.id);
    expect(data.role).toBe(updatedUser.role);

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: mockUserId },
      data: { role: 'Auditor' },
      select: {
        id: true,
        username: true,
        role: true,
        mustChangePassword: true,
        createdAt: true,
      },
    });
  });

  it('should return 500 if prisma update fails', async () => {
    vi.mocked(getSession).mockResolvedValue({
      user: { id: 'admin123', role: 'IT Administrator', username: 'admin' },
    } as { user: { id: string, role: string, username: string } });

    vi.mocked(prisma.user.update).mockRejectedValue(new Error('Database error'));

    // We still expect console.error to happen, maybe we should mock it
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const req = new NextRequest('http://localhost/api/users/123', {
      method: 'PATCH',
      body: JSON.stringify({ role: 'Auditor' }),
    });

    const response = await PATCH(req, { params: mockParams });
    expect(response.status).toBe(500);

    const data = await response.json();
    expect(data.error).toBe('Database error');

    consoleSpy.mockRestore();
  });
});
