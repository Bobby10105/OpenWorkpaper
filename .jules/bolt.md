## 2026-06-18 - [Extract React Component to Avoid Large Files]
**Learning:** Extracting moderate-sized components from large files like `page.tsx` into their own files improves code health, maintainability, and readability, avoiding monolithic structures.
**Action:** Extract large functional pieces (components, interfaces) into the `components` directory early in development. Ensure to restore the project environment (e.g. discard stray changes like `pnpm-lock.yaml`) to keep the PR clean.
