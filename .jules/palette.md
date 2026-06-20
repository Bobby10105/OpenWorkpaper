## 2026-06-20 - Prevent Redundant Icon Callouts
**Learning:** When adding `aria-label` attributes to icon-only buttons to give them accessible names, the inner SVG icons (like Lucide React components) can still be picked up by screen readers, resulting in redundant or confusing announcements (e.g., "Delete Group, graphic").
**Action:** Always add `aria-hidden="true"` to the child icon components within icon-only buttons when providing an `aria-label` on the parent button.
