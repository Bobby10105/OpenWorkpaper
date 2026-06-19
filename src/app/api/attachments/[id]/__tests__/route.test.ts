import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PUT } from '../route';
import { getSession } from '@/lib/auth';
import { canAccessAttachment } from '@/lib/audit-access';
import { prisma } from '@/lib/prisma';
import fs from 'fs/promises';

// Mock dependencies
vi.mock('@/lib/auth', () => ({
  getSession: vi.fn(),
}));

vi.mock('@/lib/audit-access', () => ({
  canAccessAttachment: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    attachment: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('fs/promises', () => ({
  default: {
    unlink: vi.fn(),
    mkdir: vi.fn(),
    writeFile: vi.fn(),
  },
}));

vi.mock('crypto', () => ({
  default: {
    randomUUID: vi.fn(() => '1234-5678'),
  },
}));

describe('PUT /api/attachments/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockRequest = (mockFile: File | string | null = null, failFormData: boolean = false) => {
    return {
      formData: failFormData
        ? vi.fn().mockRejectedValue(new Error('Parse error'))
        : vi.fn().mockResolvedValue({
            get: vi.fn((key) => {
              if (key === 'file') return mockFile;
              return null;
            }),
          }),
    } as unknown as Request;
  };

  const createMockFile = (name: string, type: string, size: number) => {
    return {
      name,
      type,
      size,
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(size)),
    } as unknown as File;
  };

  it('should return 401 if unauthorized', async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const req = createMockRequest();
    const res = await PUT(req, { params: Promise.resolve({ id: '1' }) });

    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 403 if user cannot access attachment', async () => {
    vi.mocked(getSession).mockResolvedValue({ user: { id: 'u1', username: 'test', role: 'user', mustChangePassword: false } });
    vi.mocked(canAccessAttachment).mockResolvedValue(false);

    const req = createMockRequest();
    const res = await PUT(req, { params: Promise.resolve({ id: '1' }) });

    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe('Forbidden');
  });

  it('should return 400 if no file is provided', async () => {
    vi.mocked(getSession).mockResolvedValue({ user: { id: 'u1', username: 'test', role: 'user', mustChangePassword: false } });
    vi.mocked(canAccessAttachment).mockResolvedValue(true);

    const req = createMockRequest(null);
    const res = await PUT(req, { params: Promise.resolve({ id: '1' }) });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Valid file is required');
  });

  it('should return 400 if file is a string', async () => {
    vi.mocked(getSession).mockResolvedValue({ user: { id: 'u1', username: 'test', role: 'user', mustChangePassword: false } });
    vi.mocked(canAccessAttachment).mockResolvedValue(true);

    const req = createMockRequest("just a string");
    const res = await PUT(req, { params: Promise.resolve({ id: '1' }) });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Valid file is required');
  });

  it('should return 404 if attachment is not found', async () => {
    vi.mocked(getSession).mockResolvedValue({ user: { id: 'u1', username: 'test', role: 'user', mustChangePassword: false } });
    vi.mocked(canAccessAttachment).mockResolvedValue(true);
    vi.mocked(prisma.attachment.findUnique).mockResolvedValue(null);

    const req = createMockRequest(createMockFile('test.txt', 'text/plain', 100));
    const res = await PUT(req, { params: Promise.resolve({ id: '1' }) });

    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe('Attachment not found');
  });

  it('should successfully update the attachment and replace the file', async () => {
    vi.mocked(getSession).mockResolvedValue({ user: { id: 'u1', username: 'test', role: 'user', mustChangePassword: false } });
    vi.mocked(canAccessAttachment).mockResolvedValue(true);

    const existingAttachment = {
      id: '1',
      filename: 'old.txt',
      filepath: '/uploads/old.txt',
      mimetype: 'text/plain',
      size: 50,
      procedureId: 'p1',
      createdAt: new Date(),
      updatedAt: new Date(),
      preparedBy: null,
      preparedDate: null,
      reviewedBy: null,
      reviewedDate: null,
    };

    vi.mocked(prisma.attachment.findUnique).mockResolvedValue(existingAttachment);

    const mockUpdatedAttachment = {
      ...existingAttachment,
      filename: 'new file!.txt',
      filepath: '/uploads/1234-5678-new_file_.txt',
      mimetype: 'text/plain',
      size: 100,
    };
    vi.mocked(prisma.attachment.update).mockResolvedValue(mockUpdatedAttachment);

    const req = createMockRequest(createMockFile('new file!.txt', 'text/plain', 100));
    const res = await PUT(req, { params: Promise.resolve({ id: '1' }) });

    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.filename).toBe('new file!.txt');
    expect(data.filepath).toBe('/uploads/1234-5678-new_file_.txt');

    // Verify fs functions were called
    expect(fs.unlink).toHaveBeenCalledTimes(1);
    expect(fs.unlink).toHaveBeenCalledWith(expect.stringContaining('/storage/uploads/old.txt'));
    expect(fs.mkdir).toHaveBeenCalledWith(expect.stringContaining('storage/uploads'), { recursive: true });
    expect(fs.writeFile).toHaveBeenCalledTimes(1);

    // Verify prisma update was called correctly
    expect(prisma.attachment.update).toHaveBeenCalledWith({
      where: { id: '1' },
      data: {
        filename: 'new file!.txt',
        filepath: '/uploads/1234-5678-new_file_.txt',
        mimetype: 'text/plain',
        size: 100,
      },
    });
  });

  it('should not fail if unlink throws an error (e.g. old file not found)', async () => {
    vi.mocked(getSession).mockResolvedValue({ user: { id: 'u1', username: 'test', role: 'user', mustChangePassword: false } });
    vi.mocked(canAccessAttachment).mockResolvedValue(true);

    const existingAttachment = {
      id: '1',
      filename: 'old.txt',
      filepath: '/uploads/old.txt',
      mimetype: 'text/plain',
      size: 50,
      procedureId: 'p1',
      createdAt: new Date(),
      updatedAt: new Date(),
      preparedBy: null,
      preparedDate: null,
      reviewedBy: null,
      reviewedDate: null,
    };

    vi.mocked(prisma.attachment.findUnique).mockResolvedValue(existingAttachment);
    vi.mocked(fs.unlink).mockRejectedValueOnce(new Error('ENOENT: no such file or directory'));

    const mockUpdatedAttachment = {
      ...existingAttachment,
      filename: 'new file.txt',
      filepath: '/uploads/1234-5678-new_file.txt',
      mimetype: 'text/plain',
      size: 100,
    };
    vi.mocked(prisma.attachment.update).mockResolvedValue(mockUpdatedAttachment);

    const req = createMockRequest(createMockFile('new file.txt', 'text/plain', 100));
    const res = await PUT(req, { params: Promise.resolve({ id: '1' }) });

    expect(res.status).toBe(200); // Should still succeed
  });

  it('should default mimetype to application/octet-stream if not provided', async () => {
    vi.mocked(getSession).mockResolvedValue({ user: { id: 'u1', username: 'test', role: 'user', mustChangePassword: false } });
    vi.mocked(canAccessAttachment).mockResolvedValue(true);

    const existingAttachment = {
      id: '1',
      filename: 'old.txt',
      filepath: '/uploads/old.txt',
      mimetype: 'text/plain',
      size: 50,
      procedureId: 'p1',
      createdAt: new Date(),
      updatedAt: new Date(),
      preparedBy: null,
      preparedDate: null,
      reviewedBy: null,
      reviewedDate: null,
    };

    vi.mocked(prisma.attachment.findUnique).mockResolvedValue(existingAttachment);
    vi.mocked(prisma.attachment.update).mockResolvedValue(existingAttachment); // Don't care about return for this test

    const req = createMockRequest(createMockFile('new file.xyz', '', 100)); // No type
    await PUT(req, { params: Promise.resolve({ id: '1' }) });

    // Verify prisma update was called with default mimetype
    expect(prisma.attachment.update).toHaveBeenCalledWith({
      where: { id: '1' },
      data: expect.objectContaining({
        mimetype: 'application/octet-stream',
      }),
    });
  });

  it('should return 500 if an error occurs during processing', async () => {
    vi.mocked(getSession).mockResolvedValue({ user: { id: 'u1', username: 'test', role: 'user', mustChangePassword: false } });
    vi.mocked(canAccessAttachment).mockResolvedValue(true);

    const req = createMockRequest(null, true); // Fail formData parsing

    const res = await PUT(req, { params: Promise.resolve({ id: '1' }) });

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('Failed to replace attachment');
  });
});
