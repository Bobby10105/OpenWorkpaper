## 2025-02-14 - Add rate limiting to Login Endpoint
**Vulnerability:** The login endpoint at `src/app/api/login/route.ts` did not limit the number of authentication attempts per user, making it vulnerable to credential stuffing and password brute force attacks.
**Learning:** Next.js App Router API routes can utilize simple in-memory Map structures for rudimentary rate limiting if external stores (like Redis) are not available, though these lack cross-instance state sharing. Care must be taken to clear locks periodically via `setInterval` to prevent unbounded Maps from causing memory leaks.
**Prevention:** Always implement rate limiting on authentication routes by default to mitigate credential stuffing.
