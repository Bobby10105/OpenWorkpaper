## 2024-05-18 - Replacing `@ts-ignore` with `as never` for Prisma Mocks
**Issue:** Prisma mock objects in tests often require full matching of model signatures, leading developers to use `@ts-ignore` or `as any` to suppress TypeScript errors for partially constructed mock returns. This breaks strict typescript checks and ignores real typing issues.
**Learning:** You can replace these bypass directives by asserting the incomplete mock return objects `as never`. This satisfies the compiler while keeping the type assertion inline and bypassing strict `@typescript-eslint/no-explicit-any` lint rules.
**Prevention:** Always strive to use `as never` for mocked payload objects that intentionally omit non-essential fields required by complex Prisma ORM types.
