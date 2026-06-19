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

## 2024-06-19 - Prisma N+1 Optimization Fix
**Learning:** Raw Prisma queries executed within a loop over relations can lead to severe N+1 performance bottlenecks. Refactoring this to a bulk `IN (?)` query mapped dynamically in memory can drastically decrease query count and latency (yielding up to a ~98.5% improvement in this case). Always account for empty arrays before running an `IN` query to avoid SQL syntax errors.
**Action:** When working on API routes or fetching relations with Prisma ORM, identify `Promise.all(arr.map(x => prisma.$queryRaw...))` blocks and refactor them into bulk fetch-and-map patterns. Make sure to parameterize the `IN` clause dynamically based on the number of elements in the array to prevent SQL injections.

## 2024-06-25 - Extracted DB Queries from Route Handlers
**Learning:** Large route handler functions (`GET`, `POST`, etc.) can become unwieldy when mixing authorization, validation, database fetching, data mapping, and response formatting.
**Action:** Extract database query logic (especially complex raw SQL queries and mapping/joining logic) into dedicated helper functions placed above the route handlers or in a separate file if reused. This simplifies the handler to focus on the HTTP lifecycle.

## 2024-05-20 - Unintended artifact inclusion
**Learning:** During test and validation running `pnpm install` or other package-manager scripts will modify or create lockfiles.
**Action:** Remove or `git restore` these unintended changes (like `pnpm-lock.yaml`) before committing to maintain a clean git tree.

## 2024-06-25 - Code Health Refactoring for Long Functions
**Learning:** Breaking down long functions (like a complex Next.js API `DELETE` handler) by extracting discrete blocks of logic (e.g., file cleanup operations) into clearly named, type-safe asynchronous helper functions significantly improves readability and maintainability without altering existing functionality.
**Action:** Always verify the structure of refactored code using targeted `sed` commands, ensure the refactoring introduces no new linting errors using isolated file checks if global checks fail, and clean up unintended artifact files like lockfiles (`git restore --staged pnpm-lock.yaml && rm pnpm-lock.yaml`) before concluding the task.
