## 2024-03-24 - [Unintended Lockfile Changes]
**Learning:** Running `pnpm install` might generate or update the `pnpm-lock.yaml` file unexpectedly. Including out-of-scope changes like a massive lockfile in a code health refactoring PR clutters the review and is considered poor practice.
**Action:** Before submitting code, always check `git status` to ensure only the intentionally modified files are staged for commit. If `pnpm-lock.yaml` is modified but out of scope, revert it using `git restore pnpm-lock.yaml` (and `rm pnpm-lock.yaml` if it was untracked/new).
