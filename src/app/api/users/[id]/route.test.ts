import { DELETE } from './route';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      delete: jest.fn(),
    },
  },
}));

jest.mock('@/lib/auth', () => ({
  getSession: jest.fn(),
}));

describe('DELETE /api/users/:id', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 if unauthorized', async () => {
    (getSession as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost/api/users/123');
    const response = await DELETE(req, { params: Promise.resolve({ id: '123' }) });

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 401 if user is not IT Administrator', async () => {
    (getSession as jest.Mock).mockResolvedValue({
      user: { id: 'admin1', role: 'User' },
    });

    const req = new NextRequest('http://localhost/api/users/123');
    const response = await DELETE(req, { params: Promise.resolve({ id: '123' }) });

    expect(response.status).toBe(401);
  });

  it('should return 400 if user tries to delete themselves', async () => {
    (getSession as jest.Mock).mockResolvedValue({
      user: { id: 'admin1', role: 'IT Administrator' },
    });

    const req = new NextRequest('http://localhost/api/users/admin1');
    const response = await DELETE(req, { params: Promise.resolve({ id: 'admin1' }) });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Cannot delete yourself');
  });

  it('should return 200 OK and delete user', async () => {
    (getSession as jest.Mock).mockResolvedValue({
      user: { id: 'admin1', role: 'IT Administrator' },
    });

    (prisma.user.delete as jest.Mock).mockResolvedValue({ id: '123' });

    const req = new NextRequest('http://localhost/api/users/123');
    const response = await DELETE(req, { params: Promise.resolve({ id: '123' }) });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(prisma.user.delete).toHaveBeenCalledWith({
      where: { id: '123' },
    });
  });

  it('should return 500 if prisma delete fails', async () => {
    (getSession as jest.Mock).mockResolvedValue({
      user: { id: 'admin1', role: 'IT Administrator' },
    });

    (prisma.user.delete as jest.Mock).mockRejectedValue(new Error('DB error'));

    const req = new NextRequest('http://localhost/api/users/123');
    const response = await DELETE(req, { params: Promise.resolve({ id: '123' }) });

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Delete failed');
  });
});
