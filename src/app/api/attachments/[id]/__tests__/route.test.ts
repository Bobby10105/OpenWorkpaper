import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PUT, GET } from '../route';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { canAccessAttachment } from '@/lib/audit-access';
import fs from 'fs/promises';

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  prisma: {
    attachment: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth', () => ({
  getSession: vi.fn(),
}));

vi.mock('@/lib/audit-access', () => ({
  canAccessAttachment: vi.fn(),
}));

vi.mock('fs/promises', () => ({
  default: {
    unlink: vi.fn(),
    mkdir: vi.fn(),
    writeFile: vi.fn(),
    readFile: vi.fn(),
  },
}));

// Helper to create a mock file
function createMockFile(name: string, type: string, size: number) {
  const file = new File([''], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

// Helper to create a mock request
function createMockRequest(file: File | string | null, failFormData = false) {
  return {
    formData: vi.fn().mockImplementation(() => {
      if (failFormData) {
        throw new Error('Parse error');
      }
      const formData = new FormData();
      if (file !== null) {
        formData.append('file', file);
      }
      return Promise.resolve(formData);
    }),
  } as unknown as Request;
}

describe('PUT /api/attachments/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 if unauthorized', async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const req = createMockRequest(createMockFile('test.txt', 'text/plain', 100));
    const res = await PUT(req, { params: Promise.resolve({ id: '1' }) });
    expect(res.status).toBe(401);
  });

  it('should return 403 if user cannot access attachment', async () => {
    vi.mocked(getSession).mockResolvedValue({ user: { id: 'u1', username: 'test', role: 'user', mustChangePassword: false } } as never);
    vi.mocked(canAccessAttachment).mockResolvedValue(false);
    const req = createMockRequest(createMockFile('test.txt', 'text/plain', 100));
    const res = await PUT(req, { params: Promise.resolve({ id: '1' }) });
    expect(res.status).toBe(403);
  });

  it('should return 400 if no file is provided', async () => {
    vi.mocked(getSession).mockResolvedValue({ user: { id: 'u1', username: 'test', role: 'user', mustChangePassword: false } } as never);
    vi.mocked(canAccessAttachment).mockResolvedValue(true);
    const req = createMockRequest(null);
    const res = await PUT(req, { params: Promise.resolve({ id: '1' }) });
    expect(res.status).toBe(400);
  });

  it('should return 400 if file is a string', async () => {
    vi.mocked(getSession).mockResolvedValue({ user: { id: 'u1', username: 'test', role: 'user', mustChangePassword: false } } as never);
    vi.mocked(canAccessAttachment).mockResolvedValue(true);
    const req = createMockRequest("just a string");
    const res = await PUT(req, { params: Promise.resolve({ id: '1' }) });
    expect(res.status).toBe(400);
  });

  it('should return 404 if attachment is not found', async () => {
    vi.mocked(getSession).mockResolvedValue({ user: { id: 'u1', username: 'test', role: 'user', mustChangePassword: false } } as never);
    vi.mocked(canAccessAttachment).mockResolvedValue(true);
    vi.mocked(prisma.attachment.findUnique).mockResolvedValue(null);
    const req = createMockRequest(createMockFile('test.txt', 'text/plain', 100));
    const res = await PUT(req, { params: Promise.resolve({ id: '1' }) });
    expect(res.status).toBe(404);
  });

  it('should successfully update the attachment and replace the file', async () => {
    vi.mocked(getSession).mockResolvedValue({ user: { id: 'u1', username: 'test', role: 'user', mustChangePassword: false } } as never);
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

    vi.mocked(prisma.attachment.findUnique).mockResolvedValue(existingAttachment as never);
    vi.mocked(prisma.attachment.update).mockResolvedValue({
      ...existingAttachment,
      filename: 'new file!.txt',
      filepath: '/uploads/1234-5678-new_file_.txt',
      size: 100,
    } as never);

    const req = createMockRequest(createMockFile('new file!.txt', 'text/plain', 100));
    const res = await PUT(req, { params: Promise.resolve({ id: '1' }) });

    expect(res.status).toBe(200);
    expect(fs.unlink).toHaveBeenCalledTimes(1);
    expect(prisma.attachment.update).toHaveBeenCalled();
  });

  it('should not fail if unlink throws an error', async () => {
    vi.mocked(getSession).mockResolvedValue({ user: { id: 'u1', username: 'test', role: 'user', mustChangePassword: false } } as never);
    vi.mocked(canAccessAttachment).mockResolvedValue(true);
    vi.mocked(prisma.attachment.findUnique).mockResolvedValue({ id: '1', filepath: '/uploads/old.txt' } as never);
    vi.mocked(fs.unlink).mockRejectedValueOnce(new Error('ENOENT'));
    vi.mocked(prisma.attachment.update).mockResolvedValue({ id: '1' } as never);

    const req = createMockRequest(createMockFile('new file.txt', 'text/plain', 100));
    const res = await PUT(req, { params: Promise.resolve({ id: '1' }) });

    expect(res.status).toBe(200);
  });

  it('should return 500 if an error occurs during processing', async () => {
    vi.mocked(getSession).mockResolvedValue({ user: { id: 'u1', username: 'test', role: 'user', mustChangePassword: false } } as never);
    vi.mocked(canAccessAttachment).mockResolvedValue(true);

    const req = createMockRequest(null, true);
    const res = await PUT(req, { params: Promise.resolve({ id: '1' }) });

    expect(res.status).toBe(500);
  });
});

describe('GET /api/attachments/[id]', () => {
  let consoleErrorMock: any;

  beforeEach(() => {
    consoleErrorMock = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.clearAllMocks();
  });

  afterEach(() => {
    consoleErrorMock.mockRestore();
  });

  it('should return 404 when fs.readFile throws an error', async () => {
    vi.mocked(getSession).mockResolvedValue({ user: { id: 'user1', role: 'USER' } } as never);
    vi.mocked(canAccessAttachment).mockResolvedValue(true);
    vi.mocked(prisma.attachment.findUnique).mockResolvedValue({
      id: 'test-attachment-id',
      filepath: '/test/filepath.pdf',
      mimetype: 'application/pdf',
      filename: 'test.pdf'
    } as never);

    vi.mocked(fs.readFile).mockRejectedValueOnce(new Error('Simulated read error'));

    const req = {} as Request;
    const props = { params: Promise.resolve({ id: 'test-attachment-id' }) };

    const res = await GET(req, props);

    expect(res.status).toBe(404);

    const data = await res.json();
    expect(data.error).toBe('Failed to fetch file');

    expect(consoleErrorMock).toHaveBeenCalledWith(
      'Fetch attachment error:',
      expect.any(Error)
    );
  });
});
