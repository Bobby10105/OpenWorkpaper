## 2024-06-19 - Code Health PR Title Templates
**Learning:** For code health improvement tasks, PRs must follow a specific template format to pass validations. The title must be "🧹 [code health improvement description]" and the description must explicitly contain What, Why, Verification, and Result sections.
**Action:** When creating a PR for code health improvements, adhere strictly to the requested PR template and title format (using the broom emoji).

## 2024-06-19 - Avoiding Unintended Dependency File Changes
**Learning:** Executing global package manager commands like `pnpm install` during routine code refactoring without checking the state can unintentionally generate or modify lockfiles (`pnpm-lock.yaml`) in repositories that don't track them.
**Action:** Always verify `git status` after running install commands and use `git checkout` or `rm` to discard unintended lockfile generation before committing refactoring changes.
