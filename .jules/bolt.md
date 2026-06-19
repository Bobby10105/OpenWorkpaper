## 2024-06-19 - Testing canAccessProcedure
**Learning:** Added Vitest config to test Prisma code correctly with Next.js aliases.
**Action:** Mock out prisma globally and use beforeEach to clear mocks, as implemented for audit-access.ts.

## 2024-06-19 - Vitest Absolute Path Config

**Learning:** Hardcoding absolute paths like `/app/src` in vitest configuration (`vitest.config.mts`) makes the test suite tied to a specific local environment structure and breaks portability.
**Action:** Use relative path resolution using `path.resolve(__dirname, './src')` or similar approaches to ensure configurations are fully portable.

## 2025-06-19 - Testing Prisma with Vitest
**Learning:** Testing code that uses Prisma nested relational includes (`include: { procedure: { select: { auditId: true } } }`) requires returning a mocked object that precisely matches the deeply nested structure expected by the code.
**Action:** When mocking Prisma's `findUnique` or `findFirst` methods that use `include` or `select`, construct the mock return value to contain the exact nested object properties rather than flat data.

## 2026-06-19 - Testing Next.js Route Handlers With Cookies
**Learning:** When writing Vitest tests for code that manipulates cookies through Next.js `next/headers`, `cookies()` must be mocked. Environment variables shouldn't be manipulated directly on the `process.env` object replacing its whole reference.
**Action:** Use `vi.mock('next/headers')` and `vi.stubEnv()`/`vi.unstubAllEnvs()` to correctly test and manipulate environmental factors without detaching `process.env`.

## 2024-06-19 - N+1 Query Bottleneck in Next.js Server Components
**Learning:** Found a critical N+1 query issue in Next.js server components and API routes when fetching nested relationships via Prisma `$queryRawUnsafe` (Attachments and Messages for Procedures). Running `Promise.all` over raw queries per procedure creates severe latency at scale.
**Action:** When manually writing raw SQL queries instead of using Prisma's built-in `include`, always use a batched IN clause or a subquery (e.g., `WHERE foreignKey IN (SELECT id FROM Parent WHERE condition)`) and map the results in memory.
