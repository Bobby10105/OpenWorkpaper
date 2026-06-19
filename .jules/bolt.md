## 2025-02-18 - Avoid unintended lockfile commits

**Learning:** Running `pnpm install` during regular code changes might generate a `pnpm-lock.yaml` file if it was missing or change it unintentionally.
**Action:** Always check `git status` after installing dependencies or running tools, and use `git restore` and `rm` to remove unrequested lockfiles before committing.
