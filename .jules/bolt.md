## 2024-05-16 - Clean Commit Hygiene
**Learning:** Temporary files like scratch scripts and dynamically generated lock files might get caught in a dirty working tree.
**Action:** Always check `git status` to ensure extraneous files like test scripts or unnecessary lockfiles aren't being tracked and remove them before finishing the PR.
