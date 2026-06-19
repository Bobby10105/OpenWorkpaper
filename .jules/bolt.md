## 2024-06-19 - Testing Next.js Route Handlers with raw SQL Fallbacks
**Learning:** When testing Prisma raw query fallbacks inside Next.js Route Handlers (`PUT /api/audits/:id`), `req.json()` in standard mocked `Request` objects can sometimes throw `Invalid JSON` in node/vitest environments if not initialized flawlessly.
**Action:** Bypass Vitest Request body parsing issues completely when testing error states by mocking `req.json()` directly using `req = { json: vi.fn().mockResolvedValue({ ... }) } as unknown as NextRequest` instead of instantiating `new Request()`.
