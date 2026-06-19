## 2024-06-19 - N+1 Query Bottleneck in Next.js Server Components
**Learning:** Found a critical N+1 query issue in Next.js server components and API routes when fetching nested relationships via Prisma `$queryRawUnsafe` (Attachments and Messages for Procedures). Running `Promise.all` over raw queries per procedure creates severe latency at scale.
**Action:** When manually writing raw SQL queries instead of using Prisma's built-in `include`, always use a batched IN clause or a subquery (e.g., `WHERE foreignKey IN (SELECT id FROM Parent WHERE condition)`) and map the results in memory.
