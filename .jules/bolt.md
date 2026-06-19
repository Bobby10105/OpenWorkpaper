## 2024-06-19 - Vitest Absolute Path Config

**Learning:** Hardcoding absolute paths like `/app/src` in vitest configuration (`vitest.config.mts`) makes the test suite tied to a specific local environment structure and breaks portability.
**Action:** Use relative path resolution using `path.resolve(__dirname, './src')` or similar approaches to ensure configurations are fully portable.
