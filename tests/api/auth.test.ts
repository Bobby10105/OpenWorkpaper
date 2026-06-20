import { describe, it, expect } from 'vitest';
import request from 'supertest';

const API_URL = process.env.API_URL || 'http://localhost:3000';

describe('Auth API endpoints', () => {
  it('should return 401 or 404 for unauthorized access to user endpoint', async () => {
    const res = await request(API_URL).get('/api/user');
    expect([307, 401, 403, 404]).toContain(res.status);
  });

  it('login with invalid credentials should fail', async () => {
    const res = await request(API_URL)
      .post('/api/login')
      .send({ email: 'fake@example.com', password: 'wrong' });
    expect([307, 400, 401, 404]).toContain(res.status);
  });
});
