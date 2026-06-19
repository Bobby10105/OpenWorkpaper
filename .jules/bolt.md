## 2024-06-19 - Configure Vitest Backend Tests

**Learning:** When configuring vitest for backend Next.js API routes, it is important to only use the 'node' environment and `vite-tsconfig-paths` instead of relying on frontend testing plugins, jsdom, and @testing-library. Also, use `vitest run` instead of just `vitest` for CI environments to prevent it from hanging in watch mode.
**Action:** When adding test configurations, ensure to not add UI-related dependencies when the test files are specifically API route tests. Ensure testing libraries appropriately reflect the codebase scope.
