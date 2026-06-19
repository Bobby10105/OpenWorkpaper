import { NextRequest } from 'next/server';
import { DELETE } from './route';
import { prisma } from '../../../../lib/prisma';
import { getSession } from '../../../../lib/auth';

// Mock dependencies
jest.mock('../../../../lib/prisma', () => ({
  prisma: {
    user: {
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock('../../../../lib/auth', () => ({
  getSession: jest.fn(),
}));

describe('User API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('DELETE /api/users/[id]', () => {
    it('returns 401 if user is not authenticated', async () => {
      (getSession as jest.Mock).mockResolvedValueOnce(null);

      const request = new NextRequest('http://localhost:3000/api/users/123');
      const response = await DELETE(request, { params: Promise.resolve({ id: '123' }) });
      const json = await response.json();

      expect(response.status).toBe(401);
      expect(json.error).toBe('Unauthorized');
    });

    it('returns 401 if user is not IT Administrator', async () => {
      (getSession as jest.Mock).mockResolvedValueOnce({
        user: { id: 'user1', role: 'Basic User' },
      });

      const request = new NextRequest('http://localhost:3000/api/users/123');
      const response = await DELETE(request, { params: Promise.resolve({ id: '123' }) });
      const json = await response.json();

      expect(response.status).toBe(401);
      expect(json.error).toBe('Unauthorized');
    });

    it('returns 400 when attempting to delete self', async () => {
      // The edge case identified in the prompt
      (getSession as jest.Mock).mockResolvedValueOnce({
        user: { id: 'admin123', role: 'IT Administrator' },
      });

      const request = new NextRequest('http://localhost:3000/api/users/admin123');
      const response = await DELETE(request, { params: Promise.resolve({ id: 'admin123' }) });
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error).toBe('Cannot delete yourself');
      expect(prisma.user.delete).not.toHaveBeenCalled();
    });

    it('successfully deletes another user', async () => {
      (getSession as jest.Mock).mockResolvedValueOnce({
        user: { id: 'admin123', role: 'IT Administrator' },
      });

      (prisma.user.delete as jest.Mock).mockResolvedValueOnce({ id: 'user456' });

      const request = new NextRequest('http://localhost:3000/api/users/user456');
      const response = await DELETE(request, { params: Promise.resolve({ id: 'user456' }) });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(prisma.user.delete).toHaveBeenCalledWith({
        where: { id: 'user456' },
      });
    });

    it('returns 500 on database error', async () => {
      (getSession as jest.Mock).mockResolvedValueOnce({
        user: { id: 'admin123', role: 'IT Administrator' },
      });

      (prisma.user.delete as jest.Mock).mockRejectedValueOnce(new Error('DB Error'));

      const request = new NextRequest('http://localhost:3000/api/users/user456');
      const response = await DELETE(request, { params: Promise.resolve({ id: 'user456' }) });
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.error).toBe('Delete failed');
    });
  });
});
