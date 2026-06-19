## 2026-06-19 - Code Health Refactoring: Prisma Transactions
**Learning:** When extracting a helper function for a Prisma `$transaction`, the parameter type for the transaction object should be explicitly defined as `Prisma.TransactionClient` (imported from `@prisma/client`) to maintain type safety and avoid `any` or generic type errors.
**Action:** Always import `Prisma` from `@prisma/client` and type the transaction parameter as `Prisma.TransactionClient` when moving transaction logic into separate functions. Ensure the import is placed correctly at the top of the file.
