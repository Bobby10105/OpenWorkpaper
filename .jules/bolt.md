## 2024-06-19 - Testing Next.js API Routes / Auth Modules
**Learning:** Modules in Next.js/Node (like `auth.ts`) often evaluate environment variables at the root level upon import. Trying to set them in a `beforeAll` hook inside the test will fail because the module already initialized before the hook ran.
**Action:** When an environment variable needs to be present during module initialization for testing, set it globally in a `vitest.setup.ts` file and configure `vitest.config.ts` to load it in `setupFiles`.
