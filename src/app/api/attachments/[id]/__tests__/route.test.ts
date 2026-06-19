import { GET } from '@/app/api/attachments/[id]/route';

// Mock the dependencies
jest.mock('@/lib/auth', () => ({
  getSession: jest.fn().mockResolvedValue({ user: { id: 'user1', role: 'USER' } })
}));

jest.mock('@/lib/audit-access', () => ({
  canAccessAttachment: jest.fn().mockResolvedValue(true)
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    attachment: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'test-attachment-id',
        filepath: '/test/filepath.pdf',
        mimetype: 'application/pdf',
        filename: 'test.pdf'
      })
    }
  }
}));

jest.mock('fs/promises', () => ({
  readFile: jest.fn().mockRejectedValue(new Error('Simulated read error')),
  mkdir: jest.fn(),
  writeFile: jest.fn(),
  unlink: jest.fn(),
}));

describe('GET /api/attachments/[id]', () => {
  let consoleErrorMock: jest.SpyInstance;

  beforeEach(() => {
    // Suppress console.error during the test to keep output clean
    consoleErrorMock = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorMock.mockRestore();
    jest.clearAllMocks();
  });

  it('should return 404 when fs.readFile throws an error', async () => {
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
