import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';
import { prisma } from '@/lib/prisma';
import { getSession, logout } from '@/lib/auth';
import bcrypt from 'bcryptjs';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    }
  },
}));

vi.mock('@/lib/auth', () => ({
  getSession: vi.fn(),
  logout: vi.fn(),
}));

vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn(),
  },
}));

describe('POST /api/user/change-password', () => {
  const mockUser = {
    id: 'user-123',
    username: 'testuser',
    password: 'hashed-password-123',
  };

  const createRequest = (body: Record<string, string>) => {
    return new Request('http://localhost/api/user/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 if user is not authenticated', async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    const req = createRequest({ currentPassword: 'OldPassword123!', newPassword: 'NewPassword123!' });
    const response = await POST(req);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 400 if new password does not meet complexity requirements', async () => {
    vi.mocked(getSession).mockResolvedValue({
      user: { id: mockUser.id, role: 'user', username: mockUser.username, mustChangePassword: false }
    } as never);

    const req = createRequest({ currentPassword: 'OldPassword123!', newPassword: 'weak' });
    const response = await POST(req);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Password does not meet complexity requirements');
  });

  it('should return 404 if user is not found', async () => {
    vi.mocked(getSession).mockResolvedValue({
      user: { id: mockUser.id, role: 'user', username: mockUser.username, mustChangePassword: false }
    } as never);

    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const req = createRequest({ currentPassword: 'OldPassword123!', newPassword: 'NewPassword123!' });
    const response = await POST(req);

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('User not found');
  });

  it('should return 400 if current password is invalid', async () => {
    vi.mocked(getSession).mockResolvedValue({
      user: { id: mockUser.id, role: 'user', username: mockUser.username, mustChangePassword: false }
    } as never);

    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never);
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

    const req = createRequest({ currentPassword: 'WrongPassword123!', newPassword: 'NewPassword123!' });
    const response = await POST(req);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Invalid current password');
  });

  it('should return 400 if user does not have a password (SSO)', async () => {
    vi.mocked(getSession).mockResolvedValue({
      user: { id: mockUser.id, role: 'user', username: mockUser.username, mustChangePassword: false }
    } as never);

    const ssoUser = { ...mockUser, password: null };
    vi.mocked(prisma.user.findUnique).mockResolvedValue(ssoUser as never);

    const req = createRequest({ currentPassword: 'OldPassword123!', newPassword: 'NewPassword123!' });
    const response = await POST(req);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Password change not available for SSO users');
  });

  it('should update password and return 200 on success', async () => {
    vi.mocked(getSession).mockResolvedValue({
      user: { id: mockUser.id, role: 'user', username: mockUser.username, mustChangePassword: false }
    } as never);

    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never);
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
    vi.mocked(bcrypt.hash).mockResolvedValue('new-hashed-password-123' as never);

    const req = createRequest({ currentPassword: 'OldPassword123!', newPassword: 'NewPassword123!' });
    const response = await POST(req);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: mockUser.id },
      data: {
        password: 'new-hashed-password-123',
        mustChangePassword: false,
      },
    });

    expect(logout).toHaveBeenCalled();

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        action: 'UPDATE',
        entityType: 'USER',
        entityId: mockUser.id,
        details: 'User changed their password (session terminated)',
        performedBy: mockUser.username,
      },
    });
  });

  it('should return 500 on internal server error', async () => {
    vi.mocked(getSession).mockResolvedValue({
      user: { id: mockUser.id, role: 'user', username: mockUser.username, mustChangePassword: false }
    } as never);

    vi.mocked(prisma.user.findUnique).mockRejectedValue(new Error('Database error'));

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const req = createRequest({ currentPassword: 'OldPassword123!', newPassword: 'NewPassword123!' });
    const response = await POST(req);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Internal server error');

    consoleSpy.mockRestore();
  });
});
