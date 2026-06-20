import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 50 },  // Ramp-up to 50 users
    { duration: '1m', target: 50 },   // Stay at 50 users for 1 min
    { duration: '30s', target: 0 },   // Ramp-down to 0
  ],
};

const BASE_URL = __ENV.API_URL || 'http://localhost:3000';

export default function () {
  // Simulate user browsing procedures
  const res = http.get(`${BASE_URL}/api/procedures`);
  
  check(res, {
    'status is 200, 401, or 404': (r) => [200, 401, 404].includes(r.status),
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
