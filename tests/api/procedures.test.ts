import { describe, it, expect } from 'vitest';
import request from 'supertest';

const API_URL = process.env.API_URL || 'http://localhost:3000';

describe('Procedures API endpoints', () => {
  it('should deny access to procedures without auth', async () => {
    const res = await request(API_URL).get('/api/procedures');
    expect([307, 401, 403, 404]).toContain(res.status);
  });
});
