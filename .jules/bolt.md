## 2026-06-19 - Testing Next.js Route Handlers With Cookies
**Learning:** When writing Vitest tests for code that manipulates cookies through Next.js `next/headers`, `cookies()` must be mocked. Environment variables shouldn't be manipulated directly on the `process.env` object replacing its whole reference.
**Action:** Use `vi.mock('next/headers')` and `vi.stubEnv()`/`vi.unstubAllEnvs()` to correctly test and manipulate environmental factors without detaching `process.env`.
