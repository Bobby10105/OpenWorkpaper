## 2024-06-19 - Testing canAccessProcedure
**Learning:** Added Vitest config to test Prisma code correctly with Next.js aliases.
**Action:** Mock out prisma globally and use beforeEach to clear mocks, as implemented for audit-access.ts.

## 2024-06-19 - Vitest Absolute Path Config

**Learning:** Hardcoding absolute paths like `/app/src` in vitest configuration (`vitest.config.mts`) makes the test suite tied to a specific local environment structure and breaks portability.
**Action:** Use relative path resolution using `path.resolve(__dirname, './src')` or similar approaches to ensure configurations are fully portable.

## 2025-06-19 - Testing Prisma with Vitest
**Learning:** Testing code that uses Prisma nested relational includes (`include: { procedure: { select: { auditId: true } } }`) requires returning a mocked object that precisely matches the deeply nested structure expected by the code.
**Action:** When mocking Prisma's `findUnique` or `findFirst` methods that use `include` or `select`, construct the mock return value to contain the exact nested object properties rather than flat data.
