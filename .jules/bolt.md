## 2025-03-01 - Avoid lockfile pollution

**Learning:** Running `pnpm install` can update lockfiles implicitly. Unrelated lockfile changes should not be included in a PR unless dependencies are actually changed.
**Action:** When working on code refactors, always make sure to checkout or reset any changes in `pnpm-lock.yaml` if no new dependencies were explicitly added, before running git status or creating commits.
