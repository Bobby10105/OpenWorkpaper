import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { processBulkUsers, POST } from './route';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
      createMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth', () => ({
  getSession: vi.fn(),
}));

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(),
  },
}));

describe('Bulk User Processing and API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('processBulkUsers', () => {
    it('should successfully create valid users', async () => {
      (prisma.user.findMany as Mock).mockResolvedValue([]);
      (prisma.user.createMany as Mock).mockResolvedValue({ count: 2 });
      (bcrypt.hash as Mock).mockResolvedValue('hashed_pwd');

      const users = [
        { username: 'user1', email: 'user1@example.com', role: 'Auditor', password: 'ValidPassword123!' },
        { username: 'user2', email: 'user2@example.com', role: 'Auditor', password: 'ValidPassword123!' }
      ];

      const result = await processBulkUsers(users);

      expect(result.created).toBe(2);
      expect(result.skipped).toBe(0);
      expect(result.errors.length).toBe(0);
      expect(prisma.user.findMany).toHaveBeenCalledTimes(1);
      expect(prisma.user.createMany).toHaveBeenCalledTimes(1);
      expect(prisma.user.createMany).toHaveBeenCalledWith({
        data: [
          { username: 'user1', role: 'Auditor', password: 'hashed_pwd', mustChangePassword: true },
          { username: 'user2', role: 'Auditor', password: 'hashed_pwd', mustChangePassword: true },
        ]
      });
    });

    it('should skip users missing both username and email', async () => {
      const users = [
        { role: 'Auditor', password: 'ValidPassword123!' }
      ];

      const result = await processBulkUsers(users);

      expect(result.created).toBe(0);
      expect(result.skipped).toBe(1);
      expect(result.errors).toContain('Skipped entry with missing username or email.');
      expect(prisma.user.findMany).not.toHaveBeenCalled();
    });

    it('should skip users with invalid roles', async () => {
      const users = [
        { username: 'user1', role: 'InvalidRole', password: 'ValidPassword123!' }
      ];

      const result = await processBulkUsers(users);

      expect(result.created).toBe(0);
      expect(result.skipped).toBe(1);
      expect(result.errors).toContain('Skipped user1: Invalid role.');
    });

    it('should skip users with invalid passwords', async () => {
      const users = [
        { username: 'user1', role: 'Auditor', password: 'weak' }
      ];

      const result = await processBulkUsers(users);

      expect(result.created).toBe(0);
      expect(result.skipped).toBe(1);
      expect(result.errors).toContain('Skipped user1: Password does not meet complexity requirements.');
    });

    it('should skip existing users', async () => {
      (prisma.user.findMany as Mock).mockResolvedValue([{ username: 'existing_user' }]);
      (prisma.user.createMany as Mock).mockResolvedValue({ count: 1 });
      (bcrypt.hash as Mock).mockResolvedValue('hashed_pwd');

      const users = [
        { username: 'existing_user', role: 'Auditor', password: 'ValidPassword123!' },
        { username: 'new_user', role: 'Auditor', password: 'ValidPassword123!' }
      ];

      const result = await processBulkUsers(users);

      expect(result.created).toBe(1);
      expect(result.skipped).toBe(1);
      expect(result.errors.length).toBe(0);
      expect(prisma.user.createMany).toHaveBeenCalledWith({
        data: [
          { username: 'new_user', role: 'Auditor', password: 'hashed_pwd', mustChangePassword: true },
        ]
      });
    });

    it('should handle database errors during creation', async () => {
      (prisma.user.findMany as Mock).mockResolvedValue([]);
      (prisma.user.createMany as Mock).mockRejectedValue(new Error('DB failure'));
      (bcrypt.hash as Mock).mockResolvedValue('hashed_pwd');

      const users = [
        { username: 'user1', role: 'Auditor', password: 'ValidPassword123!' }
      ];

      const result = await processBulkUsers(users);

      expect(result.created).toBe(0);
      expect(result.skipped).toBe(0);
      expect(result.errors).toContain('Failed to bulk create users: DB failure');
    });
  });

  describe('POST /api/users/bulk', () => {
    it('should return 401 if unauthorized', async () => {
      (getSession as Mock).mockResolvedValue(null);
      const req = new NextRequest('http://localhost/api/users/bulk', { method: 'POST' });
      const response = await POST(req);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data).toEqual({ error: 'Unauthorized' });
    });

    it('should return 401 if user is not IT Administrator', async () => {
      (getSession as Mock).mockResolvedValue({ user: { role: 'Auditor' } });
      const req = new NextRequest('http://localhost/api/users/bulk', { method: 'POST' });
      const response = await POST(req);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data).toEqual({ error: 'Unauthorized' });
    });

    it('should return 400 if invalid payload', async () => {
      (getSession as Mock).mockResolvedValue({ user: { role: 'IT Administrator' } });
      const req = new NextRequest('http://localhost/api/users/bulk', {
        method: 'POST',
        body: JSON.stringify({ notUsers: [] })
      });

      const response = await POST(req);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toEqual({ error: 'Invalid users list' });
    });

    it('should process users and return 200 on success', async () => {
      (getSession as Mock).mockResolvedValue({ user: { role: 'IT Administrator' } });

      const validUser = { username: 'user1', role: 'Auditor', password: 'ValidPassword123!' };
      const req = new NextRequest('http://localhost/api/users/bulk', {
        method: 'POST',
        body: JSON.stringify({ users: [validUser] })
      });

      (prisma.user.findMany as Mock).mockResolvedValue([]);
      (prisma.user.createMany as Mock).mockResolvedValue({ count: 1 });
      (bcrypt.hash as Mock).mockResolvedValue('hashed_pwd');

      const response = await POST(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.created).toBe(1);
    });

    it('should return 500 on unexpected errors in POST handler', async () => {
      (getSession as Mock).mockResolvedValue({ user: { role: 'IT Administrator' } });

      const req = new NextRequest('http://localhost/api/users/bulk', { method: 'POST' });
      // Invalid JSON body to trigger error
      req.json = vi.fn().mockRejectedValue(new Error('JSON Parse Error'));

      const response = await POST(req);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data).toEqual({ error: 'JSON Parse Error' });
    });
  });
});
