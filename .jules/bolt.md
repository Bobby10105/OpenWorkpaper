## 2025-06-19 - Testing Prisma with Vitest
**Learning:** Testing code that uses Prisma nested relational includes (`include: { procedure: { select: { auditId: true } } }`) requires returning a mocked object that precisely matches the deeply nested structure expected by the code.
**Action:** When mocking Prisma's `findUnique` or `findFirst` methods that use `include` or `select`, construct the mock return value to contain the exact nested object properties rather than flat data.
