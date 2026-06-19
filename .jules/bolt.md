
## 2024-05-20 - Unintended artifact inclusion
**Learning:** During test and validation running `pnpm install` or other package-manager scripts will modify or create lockfiles.
**Action:** Remove or `git restore` these unintended changes (like `pnpm-lock.yaml`) before committing to maintain a clean git tree.
